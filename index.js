var events = require('events');
var Chrome = require('./lib/chrome.js');

module.exports = function (options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = undefined;
    }
    options = options || {};
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
        new Chrome(options, notifier);
    });
    return notifier;
};

module.exports.listTabs = Chrome.listTabs;
