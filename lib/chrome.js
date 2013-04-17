var util = require('util');
var events = require('events');
var http = require('http');
var WebSocket = require('ws');

var Chrome = function (options, notifier) {
    var self = this;
    self.notifier = notifier;
    self.callbacks = {};
    self.nextCommandId = 1;
    connectToChrome.call(self, options.host, options.port, options.chooseTab);
}

util.inherits(Chrome, events.EventEmitter);

Chrome.prototype.send = function (method, params, callback) {
    var self = this;
    var id = self.nextCommandId++;
    if (typeof params == 'function') {
        callback = params;
        params = {};
    }
    var message = {'id': id, 'method': method, 'params': params};
    self.ws.send(JSON.stringify(message));
    // register command response callback
    if (typeof callback == 'function') {
        self.callbacks[id] = callback;
    }
}

Chrome.prototype.close = function () {
    var self = this;
    self.ws.close();
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
            var tabs = JSON.parse(data);
            var tabIndex = chooseTab(tabs);
            var tabDebuggerUrl = tabs[tabIndex].webSocketDebuggerUrl;
            connectToWebSocket.call(self, tabDebuggerUrl);
        });
    })
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
