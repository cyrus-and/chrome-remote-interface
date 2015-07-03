var defaults = require('./defaults.js');
var util = require('util');
var events = require('events');
var http = require('http');
var WebSocket = require('ws');

function Chrome(options, notifier) {
    var self = this;
    // options
    options = options || {};
    self.host = options.host || defaults.HOST;
    self.port = options.port || defaults.PORT;
    self.protocol = options.protocol;
    self.chooseTab = options.chooseTab || function () { return 0; };
    // locals
    self.notifier = notifier;
    self.callbacks = {};
    self.nextCommandId = 1;
    // operations
    connectToChrome.call(self);
}

util.inherits(Chrome, events.EventEmitter);

// callback(err, fromChrome, protocol)
Chrome.fetchProtocol = function (options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = undefined;
    }
    options = options || {};
    // TODO: this is not currently implemented in chrome but it is likely that
    // this feature will be added soon; the path is just a guess, if not present
    // Chrome will reply with a 404
    options.path = '/protocol/json';
    devToolsInterface(options, function (error, status, data) {
        var protocol;
        var fromChrome;
        try {
            if (error || status != 200) {
                protocol = require('./protocol.json');
                fromChrome = false;
            } else {
                protocol = JSON.parse(data);
                fromChrome = true;
            }
            callback(null, fromChrome, protocol);
        } catch (err) {
            callback(err);
        }
    });
};

Chrome.listTabs = function (options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = undefined;
    }
    options = options || {};
    options.path = '/json';
    devToolsInterface(options, function (error, status, data) {
        if (error) {
            callback(error);
        } else {
            if (status == 200) {
                var tabs = JSON.parse(data);
                callback(null, tabs);
            } else {
                callback(new Error(data));
            }
        }
    });
};

Chrome.spawnTab = function (options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = undefined;
    }
    options = options || {};
    options.path = '/json/new';
    if(Object.prototype.hasOwnProperty.call(options, 'url')) {
        options.path += '?' + options.url;
    }
    devToolsInterface(options, function (error, status, data) {
        if (error) {
            callback(error);
        } else {
            if (status == 200) {
                var tab = JSON.parse(data);
                callback(null, tab);
            } else {
                callback(new Error(data));
            }
        }
    });
};

Chrome.closeTab = function (options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = undefined;
    }
    options = options || {};
    options.path = '/json/close/' + options.id;
    devToolsInterface(options, function (error, status, data) {
        if (error) {
            callback(error);
        } else {
            if (status == 200) {
                callback(null);
            } else {
                callback(new Error(data));
            }
        }
    });
};

Chrome.prototype.send = function (method, params, callback) {
    var self = this;
    var id = self.nextCommandId++;
    if (typeof params === 'function') {
        callback = params;
        params = undefined;
    }
    var message = {'id': id, 'method': method, 'params': params};
    self.ws.send(JSON.stringify(message));
    // register a command response callback or use a dummy callback to ensure
    // that the 'ready' event is correctly fired
    if (typeof callback === 'undefined') {
        callback = function () {};
    }
    self.callbacks[id] = callback;
};

Chrome.prototype.close = function () {
    var self = this;
    self.ws.removeAllListeners();
    self.ws.close();
};

function prepareHelp(type, object) {
    var help = {
        'type': type
    };
    for (var field in object) {
        help[field] = object[field];
    }
    return help;
}

function addCommand(domainName, command) {
    var self = this;
    self[domainName][command.name] = function (params, callback) {
        self.send(domainName + '.' + command.name, params, callback);
    };
    self[domainName][command.name].help = prepareHelp('command', command);
}

function addEvent(domainName, event) {
    var self = this;
    self[domainName][event.name] = function (handler) {
        // Handle node.js custom inspection behavior
        // https://nodejs.org/api/util.html#util_custom_inspect_function_on_objects
        if (typeof handler === 'number' && event.name === 'inspect') {
            return util.inspect(self[domainName], {customInspect: false});
        }
        self.on(domainName + '.' + event.name, handler);
    };
    self[domainName][event.name].help = prepareHelp('event', event);
}

function addType(domainName, type) {
    var self = this;
    self[domainName][type.id] = type;
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
        // build the API from the protocol description
        addCommandShorthands.call(self);
        Chrome.listTabs(options, function (err, tabs) {
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
    // try fetching the protocol from Chrome unless not specified
    if (typeof self.protocol === 'undefined') {
        Chrome.fetchProtocol(options, function (err, fromChrome, protocol) {
            if (err) {
                self.notifier.emit('error', err);
            } else {
                self.protocol = protocol;
                continueConnection();
            }
        });
    } else {
        continueConnection();
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

// httpOptions.path must be specified; callback(err, status, data)
function devToolsInterface(httpOptions, callback) {
    httpOptions.host = httpOptions.host || defaults.HOST;
    httpOptions.port = httpOptions.port || defaults.PORT;
    var request = http.get(httpOptions, function (response) {
        var data = '';
        response.on('data', function (chunk) {
            data += chunk;
        });
        response.on('end', function () {
            callback(null, response.statusCode, data);
        });
    });
    request.on('error', function (err) {
        callback(err);
    });
}

module.exports = Chrome;
