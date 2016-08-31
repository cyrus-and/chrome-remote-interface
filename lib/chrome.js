const defaults = require('./defaults.js');
const devtools = require('./devtools.js');
const util = require('util');
const events = require('events');
const WebSocket = require('ws');

function Chrome(options, notifier) {
    const self = this;
    // options
    options = options || {};
    self.host = options.host || defaults.HOST;
    self.port = options.port || defaults.PORT;
    self.protocol = options.protocol;
    self.remote = !!(options.remote);
    self.chooseTab = options.chooseTab || function () { return 0; };
    // locals
    events.EventEmitter.call(this);
    self.notifier = notifier;
    self.callbacks = {};
    self.nextCommandId = 1;
    // operations
    connectToChrome.call(self);
}

util.inherits(Chrome, events.EventEmitter);

Chrome.prototype.inspect = function (depth, options) {
    options.customInspect = false;
    return util.inspect(this, options);
};

Chrome.prototype.send = function (method, params, callback) {
    const self = this;
    if (typeof params === 'function') {
        callback = params;
        params = undefined;
    }
    // return a promise when a callback is not provided
    if (typeof callback === 'function') {
        enqueueCommand.call(self, method, params, callback);
    } else {
        return new Promise(function (fulfill, reject) {
            enqueueCommand.call(self, method, params, function (error, response) {
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
    const self = this;
    function closeWebSocket(callback) {
        // don't notify on user-initiated shutdown ('disconnect' event)
        self.ws.removeAllListeners('close');
        self.ws.close();
        self.ws.once('close', function () {
            self.ws.removeAllListeners();
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

function enqueueCommand(method, params, callback) {
    const self = this;
    const id = self.nextCommandId++;
    const message = {'id': id, 'method': method, 'params': params};
    self.ws.send(JSON.stringify(message));
    self.callbacks[id] = callback;
}

function arrayToObject(parameters) {
    const keyValue = {};
    parameters.forEach(function (parameter) {
        const name = parameter.name;
        delete parameter.name;
        keyValue[name] = parameter;
    });
    return keyValue;
}

function decorate(to, category, object) {
    to.category = category;
    for (const field in object) {
        // commands and events have parameters whereas types have properties
        if (category === 'type' && field === 'properties' ||
            field === 'parameters') {
            to[field] = arrayToObject(object[field]);
        } else {
            to[field] = object[field];
        }
    }
}

function addCommand(domainName, command) {
    const self = this;
    const handler = function (params, callback) {
        return self.send(domainName + '.' + command.name, params, callback);
    };
    decorate(handler, 'command', command);
    self[domainName][command.name] = handler;
}

function addEvent(domainName, event) {
    const self = this;
    const handler = function (handler) {
        self.on(domainName + '.' + event.name, handler);
    };
    decorate(handler, 'event', event);
    self[domainName][event.name] = handler;
}

function addType(domainName, type) {
    const self = this;
    const help = {};
    decorate(help, 'type', type);
    self[domainName][type.id] = help;
}

function addCommandShorthands() {
    const self = this;
    for (const domainIdx in self.protocol.domains) {
        const domain = self.protocol.domains[domainIdx];
        const domainName = domain.domain;
        self[domainName] = {};
        // add commands
        const commands = domain.commands;
        if (commands) {
            for (const commandIdx in commands) {
                const command = commands[commandIdx];
                addCommand.call(self, domainName, command);
            }
        }
        // add events
        const events = domain.events;
        if (events) {
            for (const eventIdx in events) {
                const event = events[eventIdx];
                addEvent.call(self, domainName, event);
            }
        }
        // add types
        const types = domain.types;
        if (types) {
            for (const typeIdx in types) {
                const type = types[typeIdx];
                addType.call(self, domainName, type);
            }
        }
    }
}

function connectToChrome() {
    const self = this;
    const options = {'host': self.host, 'port': self.port};
    // fetch the WebSocket debugger URL from the user choice (`chooseTab`)
    const fetchDebuggerURL = function (callback) {
        // when DevTools are open or another WebSocket is connected to a given
        // tab the `webSocketDebuggerUrl` filed is not available
        const busyTabError = new Error('Tab does not support inspection');
        var url;
        switch (typeof self.chooseTab) {
        case 'string':
            // a WebSocket URL is specified by the user (e.g., node-inspector)
            callback(null, self.chooseTab);
            break;
        case 'object':
            // a tab object is specified by the user
            url = self.chooseTab.webSocketDebuggerUrl;
            if (url) {
                callback(null, url);
            } else {
                callback(busyTabError);
            }
            break;
        case 'function':
            // a function is specified by the user (get tab by index)
            devtools.List(options, function (err, tabs) {
                if (err) {
                    callback(err);
                } else {
                    // the index is used to fetch the proper tab from the list
                    const tab = tabs[self.chooseTab(tabs)];
                    if (tab) {
                        url = tab.webSocketDebuggerUrl;
                        if (url) {
                            callback(null, url);
                        } else {
                            callback(busyTabError);
                        }
                    } else {
                        callback(new Error('Invalid tab index'));
                    }
                }
            });
            break;
        default:
            callback(new Error('Invalid requested tab'));
        }
    };
    // parse the protocol and finalize connection
    const continueConnection = function () {
        // build the API from the protocol descriptor
        addCommandShorthands.call(self);
        // get the WebSocket debugger URL
        fetchDebuggerURL(function (err, url) {
            if (err) {
                self.notifier.emit('error', err);
            } else {
                connectToWebSocket.call(self, url);
            }
        });
    };
    // if a protocol has been provided then use it
    if (self.protocol) {
        continueConnection();
    } else {
        // otherwise user either the local or the remote version
        options.remote = self.remote;
        devtools.Protocol(options, function (err, protocol) {
            if (err) {
                self.notifier.emit('error', err);
            } else {
                self.protocol = protocol.descriptor;
                continueConnection();
            }
        });
    }
}

function connectToWebSocket(url) {
    const self = this;
    try {
        // disable the permessage-deflate as a temporary fix for #39
        self.ws = new WebSocket(url, {'perMessageDeflate': false});
    } catch (err) {
        self.notifier.emit('error', err);
        return;
    }
    self.ws.on('open', function () {
        self.notifier.emit('connect', self);
    });
    self.ws.on('message', function (data) {
        const message = JSON.parse(data);
        // command response
        if (message.id) {
            const callback = self.callbacks[message.id];
            if (callback) {
                // interpret the lack of both 'error' and 'result' as success
                // (this may happen with node-inspector)
                if (message.error) {
                    callback(true, message.error);
                } else {
                    callback(false, message.result || {});
                }
                // unregister command response callback
                delete self.callbacks[message.id];
                // notify when there are no more pending commands
                if (Object.keys(self.callbacks).length === 0) {
                    self.emit('ready');
                }
            }
        }
        // event
        else if (message.method) {
            self.emit('event', message);
            self.emit(message.method, message.params);
        }
    });
    self.ws.on('close', function () {
        self.notifier.emit('disconnect');
    });
    self.ws.on('error', function (err) {
        self.notifier.emit('error', err);
    });
}

module.exports = Chrome;
