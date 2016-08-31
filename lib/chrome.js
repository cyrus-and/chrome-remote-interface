const events = require('events');
const util = require('util');

const WebSocket = require('ws');

const api = require('./api.js');
const defaults = require('./defaults.js');
const devtools = require('./devtools.js');

function Chrome(options, notifier) {
    // options
    options = options || {};
    this.host = options.host || defaults.HOST;
    this.port = options.port || defaults.PORT;
    this.protocol = options.protocol;
    this.remote = !!(options.remote);
    this.chooseTab = options.chooseTab || function () { return 0; };
    // locals
    events.EventEmitter.call(this);
    this.notifier = notifier;
    this.callbacks = {};
    this.nextCommandId = 1;
    // operations
    start.call(this);
}

util.inherits(Chrome, events.EventEmitter);

// avoid misinterpreting protocol's members as custom util.inspect functions
Chrome.prototype.inspect = function (depth, options) {
    options.customInspect = false;
    return util.inspect(this, options);
};

Chrome.prototype.send = function (method, params, callback) {
    const chrome = this;
    if (typeof params === 'function') {
        callback = params;
        params = undefined;
    }
    // return a promise when a callback is not provided
    if (typeof callback === 'function') {
        enqueueCommand.call(chrome, method, params, callback);
    } else {
        return new Promise(function (fulfill, reject) {
            enqueueCommand.call(chrome, method, params, function (error, response) {
                if (error) {
                    reject(response);
                } else {
                    fulfill(response);
                }
            });
        });
    }
};

Chrome.prototype.close = function (callback) {
    const chrome = this;
    function closeWebSocket(callback) {
        // don't notify on user-initiated shutdown ('disconnect' event)
        chrome.ws.removeAllListeners('close');
        chrome.ws.close();
        chrome.ws.once('close', function () {
            chrome.ws.removeAllListeners();
            callback();
        });
    }
    if (typeof callback === 'function') {
        closeWebSocket(callback);
    } else {
        return new Promise(function (fulfill, reject) {
            closeWebSocket(fulfill);
        });
    }
};

// send a command to the remote endpoint and register a callback for the reply
function enqueueCommand(method, params, callback) {
    const chrome = this;
    const id = chrome.nextCommandId++;
    const message = {'id': id, 'method': method, 'params': params};
    chrome.ws.send(JSON.stringify(message));
    chrome.callbacks[id] = callback;
}

// initiate the connection process
function start() {
    const chrome = this;
    const options = {'host': chrome.host, 'port': chrome.port};
    Promise.all([
        // fetch the protocol and prepare the API
        fetchProtocol.call(chrome, options).then(api.prepare.bind(chrome)),
        // in the meanwhile fetch the WebSocket debugger URL
        fetchDebuggerURL.call(chrome, options)
    ]).then(function (values) {
        // finally connect to the WebSocket
        const url = values[1];
        return connectToWebSocket.call(chrome, url);
    }).then(function () {
        chrome.notifier.emit('connect', chrome);
    }).catch(function (err) {
        chrome.notifier.emit('error', err);
    });
}

// fetch the protocol according to 'protocol' and 'remote'
function fetchProtocol(options) {
    const chrome = this;
    return new Promise(function (fulfill, reject) {
        // if a protocol has been provided then use it
        if (chrome.protocol) {
            fulfill(chrome.protocol);
        }
        // otherwise user either the local or the remote version
        else {
            options.remote = chrome.remote;
            devtools.Protocol(options).then(function (protocol) {
                fulfill(protocol.descriptor);
            }).catch(reject);
        }
    });
}

// fetch the WebSocket URL according to 'chooseTab'
function fetchDebuggerURL(options) {
    const chrome = this;
    return new Promise(function (fulfill, reject) {
        // when DevTools are open or another WebSocket is connected to a given
        // tab the 'webSocketDebuggerUrl' field is not available
        const busyTabError = new Error('Tab does not support inspection');
        var url;
        switch (typeof chrome.chooseTab) {
        case 'string':
            // a WebSocket URL is specified by the user (e.g., node-inspector)
            fulfill(chrome.chooseTab);
            break;
        case 'object':
            // a tab object is specified by the user
            url = chrome.chooseTab.webSocketDebuggerUrl;
            if (url) {
                fulfill(url);
            } else {
                reject(busyTabError);
            }
            break;
        case 'function':
            // a function is specified by the user (get tab by index)
            devtools.List(options).then(function (tabs) {
                // the index is used to fetch the proper tab from the list
                const tab = tabs[chrome.chooseTab(tabs)];
                if (tab) {
                    url = tab.webSocketDebuggerUrl;
                    if (url) {
                        fulfill(url);
                    } else {
                        reject(busyTabError);
                    }
                } else {
                    reject(new Error('Invalid tab index'));
                }
            }).catch(reject);
            break;
        default:
            reject(new Error('Invalid requested tab'));
        }
    });
}

// establish the WebSocket connection and start processing user commands
function connectToWebSocket(url) {
    const chrome = this;
    return new Promise(function (fulfill, reject) {
        // create the WebSocket
        try {
            // disable the permessage-deflate as a temporary fix for #39
            chrome.ws = new WebSocket(url, {'perMessageDeflate': false});
        } catch (err) {
            // handles bad URLs
            reject(err);
            return;
        }
        // set up event handlers
        chrome.ws.on('open', function () {
            fulfill();
        });
        chrome.ws.on('message', function (data) {
            const message = JSON.parse(data);
            handleMessage.call(chrome, message);
        });
        chrome.ws.on('close', function () {
            chrome.notifier.emit('disconnect');
        });
        chrome.ws.on('error', function (err) {
            reject(err);
        });
    });
}

// handle the messages read from the WebSocket
function handleMessage(message) {
    const chrome = this;
    // command response
    if (message.id) {
        const callback = chrome.callbacks[message.id];
        if (!callback) {
            return;
        }
        // interpret the lack of both 'error' and 'result' as success
        // (this may happen with node-inspector)
        if (message.error) {
            callback(true, message.error);
        } else {
            callback(false, message.result || {});
        }
        // unregister command response callback
        delete chrome.callbacks[message.id];
        // notify when there are no more pending commands
        if (Object.keys(chrome.callbacks).length === 0) {
            chrome.emit('ready');
        }
    }
    // event
    else if (message.method) {
        chrome.emit('event', message);
        chrome.emit(message.method, message.params);
    }
}

module.exports = Chrome;
