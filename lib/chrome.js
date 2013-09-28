var protocol = require('./Inspector.json');
var util = require('util');
var events = require('events');
var http = require('http');
var WebSocket = require('ws');

var Chrome = function (options, notifier) {
    var self = this;
    self.host = options.host;
    self.port = options.port;
    self.chooseTab = options.chooseTab;
    self.notifier = notifier;
    self.callbacks = {};
    self.nextCommandId = 1;
    addCommandShorthands.call(self);
    connectToChrome.call(self);
};

util.inherits(Chrome, events.EventEmitter);

Chrome.prototype.send = function (method, params, callback) {
    var self = this;
    var id = self.nextCommandId++;
    if (typeof params === 'function') {
        callback = params;
        params = undefined;
    }
    var message = {'id': id, 'method': method, 'params': params};
    self.ws.send(JSON.stringify(message));
    // register command response callback
    if (typeof callback === 'function') {
        self.callbacks[id] = callback;
    }
};

Chrome.prototype.listTabs = function (callback) {
    var self = this;
    var options = {'host': self.host, 'port': self.port, 'path': '/json'};
    var request = http.get(options, function (response) {
        var data = '';
        response.on('data', function (chunk) {
            data += chunk;
        });
        response.on('end', function () {
            var tabs = JSON.parse(data);
            callback(null, tabs);
        });
    });
    request.on('error', function (error) {
        callback(error);
    });
};

Chrome.prototype.close = function () {
    var self = this;
    self.ws.removeAllListeners();
    self.ws.close();
};

function addCommand(domainName, command) {
    var self = this;
    Chrome.prototype[domainName][command.name] = function (params, callback) {
        self.send(domainName + '.' + command.name, params, callback);
    };
    Chrome.prototype[domainName][command.name].help = command;
}

function addEvent(domainName, event) {
    var self = this;
    Chrome.prototype[domainName][event.name] = function (handler) {
        self.on(domainName + '.' + event.name, handler);
    };
    Chrome.prototype[domainName][event.name].help = event;
}

function addType(domainName, type) {
    var self = this;
    Chrome.prototype[domainName][type.id] = type;
}

function addCommandShorthands() {
    var self = this;
    for (var domainIdx in protocol.domains) {
        var domain = protocol.domains[domainIdx];
        var domainName = domain.domain;
        Chrome.prototype[domainName] = {};
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
    self.listTabs(function (err, tabs) {
        if (err) {
            self.notifier.emit('error', err);
        } else {
            var tabError;
            var tab = tabs[self.chooseTab(tabs)];
            if (tab) {
                var tabDebuggerUrl = tab.webSocketDebuggerUrl;
                if (tabDebuggerUrl) {
                    connectToWebSocket.call(self, tabDebuggerUrl);
                } else {
                    // a WebSocket is already connected to this tab?
                    tabError = new Error('Chosen tab does not support inspection');
                    self.notifier.emit('error', tabError);
                }
            } else {
                tabError = new Error('Invalid tab index');
                self.notifier.emit('error', tabError);
            }
        }
    });
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
            }
        }
        // event
        else if (message.method) {
            self.emit('event', message);
            self.emit(message.method, message.params);
        }
    });
    self.ws.on('error', function (error) {
        self.notifier.emit('error', error);
    });
}

module.exports = Chrome;
