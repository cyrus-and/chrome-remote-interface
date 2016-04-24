var events = require('events');
var Chrome = require('./lib/chrome.js');

module.exports = function (options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = undefined;
    }
    var notifier = new events.EventEmitter();
    if (callback) {
        // allow to register the error callback later
        process.nextTick(function () {
            new Chrome(options, notifier);
        });
        return notifier.on('connect', callback);
    } else {
        return new Promise(function (fulfill, reject) {
            notifier.on('connect', fulfill);
            notifier.on('error', reject);
            new Chrome(options, notifier);
        });
    }
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
