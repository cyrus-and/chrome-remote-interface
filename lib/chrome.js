var defaults = require('./defaults.js');
var util = require('util');
var events = require('events');
var http = require('http');
var https = require('https');
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
Chrome.Protocol = function (options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = undefined;
    }
    options = options || {};
    var fallbackProtocol = require('./protocol.json');
    // attempt to fetch the protocol directly from the Chromium repository
    // according to the current version; fallback to the hardcoded version
    //
    // Thanks to Paul Irish.
    // (see https://github.com/cyrus-and/chrome-remote-interface/issues/10#issuecomment-146032907)
    Chrome.Version(options, function (err, info) {
        if (err) {
            callback(null, false, fallbackProtocol);
        } else {
            var version = info['WebKit-Version'];
            var match = version.match(/\s\(@(\b[0-9a-f]{5,40}\b)/);
            var hash = match[1];
            var fromChromiumDotOrg = (hash <= 202666);
            var template = (fromChromiumDotOrg ?
                'https://src.chromium.org/blink/trunk/Source/devtools/protocol.json?p=%s':
                'https://chromium.googlesource.com/chromium/src/+/%s/third_party/WebKit/Source/devtools/protocol.json?format=TEXT');
            var url = util.format(template, hash);
            var request = https.get(url, function (response) {
                var data = '';
                response.on('data', function (chunk) {
                    data += chunk;
                });
                response.on('end', function () {
                    if (response.statusCode === 200) {
                        try {
                            // the file is served base64 encoded from googlesource.com
                            if (!fromChromiumDotOrg) {
                                data = new Buffer(data, 'base64').toString();
                            }
                            callback(null, true, JSON.parse(data));
                        } catch (err) {
                            callback(null, false, fallbackProtocol);
                        }
                    } else {
                        callback(null, false, fallbackProtocol);
                    }
                });
            });
            request.on('error', function (err) {
                callback(null, false, fallbackProtocol);
            });
        }
    });
};

Chrome.List = function (options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = undefined;
    }
    options = options || {};
    options.path = '/json/list';
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

Chrome.New = function (options, callback) {
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

Chrome.Activate = function (options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = undefined;
    }
    options = options || {};
    options.path = '/json/activate/' + options.id;
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

Chrome.Close = function (options, callback) {
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

Chrome.Version = function (options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = undefined;
    }
    options = options || {};
    options.path = '/json/version';
    devToolsInterface(options, function (error, status, data) {
        if (error) {
            callback(error);
        } else {
            if (status == 200) {
                var versionInfo = JSON.parse(data);
                callback(null, versionInfo);
            } else {
                callback(new Error(data));
            }
        }
    });
};

Chrome.prototype.inspect = function (depth, options) {
    options.customInspect = false;
    return util.inspect(this, options);
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
        // build the API from the protocol descriptor
        addCommandShorthands.call(self);
        Chrome.List(options, function (err, tabs) {
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
    // fetch the protocol
    if (self.protocol === null) {
        // try fetching the protocol from Chrome falling back to the hardcoded
        // version otherwise
        Chrome.Protocol(options, function (err, fromChrome, protocol) {
            if (err) {
                self.notifier.emit('error', err);
            } else {
                self.protocol = protocol;
                continueConnection();
            }
        });
    } else {
        // use the one provided falling back to the hardcoded version otherwise
        if (typeof self.protocol === 'undefined') {
            self.protocol = require('./protocol.json');
        }
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
