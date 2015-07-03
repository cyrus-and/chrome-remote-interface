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

// for backward compatibility
module.exports.listTabs = Chrome.List;
module.exports.spawnTab = Chrome.New;
module.exports.closeTab = Chrome.Close;

module.exports.Protocol = Chrome.Protocol;
module.exports.List = Chrome.List;
module.exports.New = Chrome.New;
module.exports.Activate = Chrome.Activate;
module.exports.Close = Chrome.Close;
module.exports.Version = Chrome.Version;
