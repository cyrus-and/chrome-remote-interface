'use strict';

const EventEmitter = require('events');
const util = require('util');
const parseUrl = require('url').parse;

const WebSocket = require('ws');

const api = require('./api');
const defaults = require('./defaults');
const devtools = require('./devtools');

class ProtocolError extends Error {
    constructor(response) {
        let message = response.message;
        if (response.data) {
            message += ` (${response.data})`;
        }
        super(message);
        // attach the original response as well
        this.response = response;
    }
}

class Chrome extends EventEmitter {
    constructor(options, notifier) {
        super();
        // options
        const defaultTarget = function (targets) {
            // prefer type = 'page' inspectabe targets as they represents
            // browser tabs (fall back to the first instectable target
            // otherwise)
            let backup;
            let target = targets.find((target) => {
                if (target.webSocketDebuggerUrl) {
                    backup = backup || target;
                    return target.type === 'page';
                } else {
                    return false;
                }
            });
            target = target || backup;
            if (target) {
                return target;
            } else {
                throw new Error('No inspectable targets');
            }
        };
        options = options || {};
        this.host = options.host || defaults.HOST;
        this.port = options.port || defaults.PORT;
        this.secure = !!(options.secure);
        this.protocol = options.protocol;
        this.local = !!(options.local);
        this.target = options.target ||
            /* backward compatibility */ options.tab || options.chooseTab
            || defaultTarget;
        // locals
        EventEmitter.call(this);
        this._notifier = notifier;
        this._callbacks = {};
        this._nextCommandId = 1;
        // properties
        this.webSocketUrl = undefined;
        // operations
        start.call(this);
    }
}

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
                    reject(error instanceof Error
                           ? error // low-level WebSocket error
                           : new ProtocolError(response));
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
        chrome._ws.removeAllListeners('close');
        chrome._ws.close();
        chrome._ws.once('close', function () {
            chrome._ws.removeAllListeners();
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
    const id = chrome._nextCommandId++;
    const message = {'id': id, 'method': method, 'params': params || {}};
    chrome._ws.send(JSON.stringify(message), function (err) {
        if (err) {
            // handle low-level WebSocket errors
            if (typeof callback === 'function') {
                callback(err);
            }
        } else {
            chrome._callbacks[id] = callback;
        }
    });
}

// initiate the connection process
function start() {
    const chrome = this;
    const options = {'host': chrome.host, 'port': chrome.port, 'secure': chrome.secure};
    // fetch the WebSocket debugger URL
    fetchDebuggerURL.call(chrome, options).then(function (url) {
        chrome.webSocketUrl = url;
        // update the connection parameters using the debugging URL
        const urlObject = parseUrl(url);
        options.host = urlObject.hostname;
        options.port = urlObject.port;
        // fetch the protocol and prepare the API
        return fetchProtocol.call(chrome, options).then(api.prepare.bind(chrome));
    }).then(function (values) {
        // finally connect to the WebSocket
        return connectToWebSocket.call(chrome, chrome.webSocketUrl);
    }).then(function () {
        // since the handler is executed synchronously, the emit() must be
        // performed in the next tick so that uncaught errors in the client code
        // are not intercepted by the Promise mechanism and therefore reported
        // via the 'error' event
        process.nextTick(function () {
            chrome._notifier.emit('connect', chrome);
        });
    }).catch(function (err) {
        chrome._notifier.emit('error', err);
    });
}

// fetch the protocol according to 'protocol' and 'local'
function fetchProtocol(options) {
    const chrome = this;
    return new Promise(function (fulfill, reject) {
        // if a protocol has been provided then use it
        if (chrome.protocol) {
            fulfill(chrome.protocol);
        }
        // otherwise user either the local or the remote version
        else {
            options.local = chrome.local;
            devtools.Protocol(options).then(function (protocol) {
                fulfill(protocol);
            }).catch(reject);
        }
    });
}

// extract the debugger URL from a target-like object
function fetchFromObject(fulfill, reject, target) {
    const url = (target || {}).webSocketDebuggerUrl;
    if (url) {
        fulfill(url);
    } else {
        const targetStr = JSON.stringify(target, null, 4);
        const err = new Error('Invalid target ' + targetStr);
        reject(err);
    }
}

// fetch the WebSocket URL according to 'target'
function fetchDebuggerURL(options) {
    const chrome = this;
    return new Promise(function (fulfill, reject) {
        // note: when DevTools are open or another WebSocket is connected to a
        // given target the 'webSocketDebuggerUrl' field is not available
        let userTarget = chrome.target;
        switch (typeof userTarget) {
        case 'string':
            // use default host and port if omitted (and a relative URL is specified)
            if (userTarget.startsWith('/')) {
                const prefix = 'ws://' + chrome.host + ':' + chrome.port;
                userTarget = prefix + userTarget;
            }
            // a WebSocket URL is specified by the user (e.g., node-inspector)
            if (userTarget.match(/^wss?:/i)) {
                fulfill(userTarget);
            }
            // a target id is specified by the user
            else {
                devtools.List(options).then(function (targets) {
                    return targets.find(function (target) {
                        return target.id === userTarget;
                    });
                }).then(function (target) {
                    fetchFromObject(fulfill, reject, target);
                }).catch(reject);
            }
            break;
        case 'object':
            // a target object is specified by the user
            fetchFromObject(fulfill, reject, userTarget);
            break;
        case 'function':
            // a function is specified by the user
            devtools.List(options).then(function (targets) {
                const result = userTarget(targets);
                if (typeof result === 'number') {
                    return targets[result];
                } else {
                    return result;
                }
            }).then(function (target) {
                fetchFromObject(fulfill, reject, target);
            }).catch(reject);
            break;
        default:
            reject(new Error('Invalid target argument "' + chrome.target + '"'));
        }
    });
}

// establish the WebSocket connection and start processing user commands
function connectToWebSocket(url) {
    const chrome = this;
    return new Promise(function (fulfill, reject) {
        // create the WebSocket
        try {
            if (chrome.secure) {
                url = url.replace(/^ws:/i, 'wss:');
            }
            chrome._ws = new WebSocket(url);
        } catch (err) {
            // handles bad URLs
            reject(err);
            return;
        }
        // set up event handlers
        chrome._ws.on('open', function () {
            fulfill();
        });
        chrome._ws.on('message', function (data) {
            const message = JSON.parse(data);
            handleMessage.call(chrome, message);
        });
        chrome._ws.on('close', function (code) {
            chrome.emit('disconnect');
        });
        chrome._ws.on('error', function (err) {
            reject(err);
        });
    });
}

// handle the messages read from the WebSocket
function handleMessage(message) {
    const chrome = this;
    // command response
    if (message.id) {
        const callback = chrome._callbacks[message.id];
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
        delete chrome._callbacks[message.id];
        // notify when there are no more pending commands
        if (Object.keys(chrome._callbacks).length === 0) {
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
