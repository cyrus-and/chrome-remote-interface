var defaults = require('./defaults.js');
var devtools = require('./devtools.js');
var util = require('util');
var events = require('events');
var WebSocket = require('ws');

function Chrome(options, notifier) {
    var self = this;
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
    var self = this;
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
    var self = this;
    function closeWebSocket(callback) {
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
    var self = this;
    var id = self.nextCommandId++;
    var message = {'id': id, 'method': method, 'params': params};
    self.ws.send(JSON.stringify(message));
    self.callbacks[id] = callback;
}

function arrayToObject(parameters) {
    var keyValue = {};
    parameters.forEach(function (parameter) {
        var name = parameter.name;
        delete parameter.name;
        keyValue[name] = parameter;
    });
    return keyValue;
}

function decorate(to, category, object) {
    to.category = category;
    for (var field in object) {
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
    var self = this;
    var handler = function (params, callback) {
        return self.send(domainName + '.' + command.name, params, callback);
    };
    decorate(handler, 'command', command);
    self[domainName][command.name] = handler;
}

function addEvent(domainName, event) {
    var self = this;
    var handler = function (handler) {
        self.on(domainName + '.' + event.name, handler);
    };
    decorate(handler, 'event', event);
    self[domainName][event.name] = handler;
}

function addType(domainName, type) {
    var self = this;
    var help = {};
    decorate(help, 'type', type);
    self[domainName][type.id] = help;
}

function addCommandShorthands() {
    var self = this;
    for (var domainIdx in self.protocol.domains) {
        var domain = self.protocol.domains[domainIdx];
        var domainName = domain.domain;
        self[domainName] = {};
        // add commands
        var commands = domain.commands;
        if (commands) {
            for (var commandIdx in commands) {
                var command = commands[commandIdx];
                addCommand.call(self, domainName, command);
            }
        }
        // add events
        var events = domain.events;
        if (events) {
            for (var eventIdx in events) {
                var event = events[eventIdx];
                addEvent.call(self, domainName, event);
            }
        }
        // add types
        var types = domain.types;
        if (types) {
            for (var typeIdx in types) {
                var type = types[typeIdx];
                addType.call(self, domainName, type);
            }
        }
    }
}

function connectToChrome() {
    var self = this;
    var options = {'host': self.host, 'port': self.port};
    var continueConnection = function () {
        // build the API from the protocol descriptor
        addCommandShorthands.call(self);
        devtools.List(options, function (err, tabs) {
            if (err) {
                self.notifier.emit('error', err);
            } else {
                var tabError;
                var tab;
                if (typeof self.chooseTab === 'object') {
                    tab = self.chooseTab;
                } else {
                    tab = tabs[self.chooseTab(tabs)];
                }
                if (tab) {
                    var tabDebuggerUrl = tab.webSocketDebuggerUrl;
                    if (tabDebuggerUrl) {
                        connectToWebSocket.call(self, tabDebuggerUrl);
                    } else {
                        // a WebSocket is already connected to this tab?
                        tabError = new Error('Tab does not support inspection');
                        self.notifier.emit('error', tabError);
                    }
                } else {
                    tabError = new Error('Invalid tab index');
                    self.notifier.emit('error', tabError);
                }
            }
        });
    };
    // if a protocol has been provided then use it
    if (self.protocol) {
        continueConnection();
    } else {
        // otherwise user either the local or the remore version
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
    var self = this;
    self.ws = new WebSocket(url);
    self.ws.on('open', function () {
        self.notifier.emit('connect', self);
    });
    self.ws.on('message', function (data) {
        var message = JSON.parse(data);
        // command response
        if (message.id) {
            var callback = self.callbacks[message.id];
            if (callback) {
                if (message.result) {
                    callback(false, message.result);
                } else if (message.error) {
                    callback(true, message.error);
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
    self.ws.on('error', function (err) {
        self.notifier.emit('error', err);
    });
}

module.exports = Chrome;
