var protocol = require('./Inspector.json');
var util = require('util');
var events = require('events');
var http = require('http');
var WebSocket = require('ws');

var Chrome = function (options, notifier) {
    var self = this;
    addCommandShorthands.call(self);
    self.notifier = notifier;
    self.callbacks = {};
    self.nextCommandId = 1;
    connectToChrome.call(self, options.host, options.port, options.chooseTab);
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

Chrome.prototype.close = function () {
    var self = this;
    self.ws.removeAllListeners();
    self.ws.close();
};

function addCommand(domain, command, help) {
    var self = this;
    console.log(domain, command)
    Chrome.prototype[domain][command] = function (params, callback) {
        self.send(domain + '.' + command, params, callback);
    };
    Chrome.prototype[domain][command].help = help;
}

function addCommandShorthands() {
    var self = this;
    for (var domain in protocol.domains) {
        var domainName = protocol.domains[domain].domain;
        Chrome.prototype[domainName] = {};
        var commands = protocol.domains[domain].commands;
        for (var i = 0; i < commands.length; i++) {
            var command = commands[i].name;
            delete commands[i].name
            addCommand.call(self, domainName, command, commands[i]);
        }
    }
}

function connectToChrome(host, port, chooseTab) {
    var self = this;
    var options = {'host': host, 'port': port, 'path': '/json'};
    var request = http.get(options, function (response) {
        var data = '';
        response.on('data', function (chunk) {
            data += chunk;
        });
        response.on('end', function () {
            var error;
            var tabs = JSON.parse(data);
            var tab = tabs[chooseTab(tabs)];
            if (tab) {
                var tabDebuggerUrl = tab.webSocketDebuggerUrl;
                if (tabDebuggerUrl) {
                    connectToWebSocket.call(self, tabDebuggerUrl);
                } else {
                    // a WebSocket is already connected to this tab?
                    error = new Error('Unable to connect to the WebSocket');
                    self.notifier.emit('error', error);
                }
            } else {
                error = new Error('Invalid tab index');
                self.notifier.emit('error', error);
            }
        });
    });
    request.on('error', function (error) {
        self.notifier.emit('error', error);
    });
}

function connectToWebSocket(url) {
    var self = this;
    self.ws = new WebSocket(url);
    self.ws.on('open', function() {
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
