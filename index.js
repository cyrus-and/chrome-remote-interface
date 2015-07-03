var events = require('events');
var Chrome = require('./lib/chrome.js');

module.exports = function (options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = undefined;
    }
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
        // create the client passing the notifier
        new Chrome(options, notifier);
    });
    return notifier;
};

module.exports.fetchProtocol = Chrome.fetchProtocol;
module.exports.listTabs = Chrome.listTabs;
module.exports.spawnTab = Chrome.spawnTab;
module.exports.activateTab = Chrome.activateTab;
module.exports.closeTab = Chrome.closeTab;
module.exports.fetchVersion = Chrome.fetchVersion;
