var events = require('events');
var Chrome = require('./lib/chrome.js');

module.exports = function (options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = undefined;
    }
    options = options || {};
    options.host = options.host || 'localhost';
    options.port = options.port || 9222;
    options.chooseTab = options.chooseTab || function () { return 0; };
  
    var notifier = new events.EventEmitter();
    if (typeof callback === 'function') {
        notifier.on('connect', callback);
    }
    // allow to register callbacks later
    process.nextTick(function () {
        // the default listener just disconnects from Chrome, this can be used
        // to simply check the connection
        if (notifier.listeners('connect').length === 0) {
            notifier.on('connect', function (chrome) {
                chrome.close();
            });
        }
        var chrome = new Chrome(options, notifier);
        chrome.listTabs(options.host, options.port, function(err, tabs) {
            if (err)
               return self.notifier.emit('error', err);

            var tab = tabs[options.chooseTab(tabs)];
            if (tab) {
                var tabDebuggerUrl = tab.webSocketDebuggerUrl;
                if (tabDebuggerUrl) {
                    chrome.connectToWebSocket.call(self, tabDebuggerUrl);
                } else {
                    // a WebSocket is already connected to this tab?
                    error = new Error('Unable to connect to the WebSocket');
                    notifier.emit('error', error);
                }
            } else {
                error = new Error('Invalid tab index');
                notifier.emit('error', error);
            }
        });
    });
    return notifier;
};

module.exports.createClient = function () {
    var notifier = new events.EventEmitter();
    var chrome = new Chrome({}, notifier);
    notifier.on('connect', function() { chrome.emit('connect') });
    notifier.on('error', function(e) { chrome.emit('error', e) });
    return chrome;
};
