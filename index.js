'use strict';

const EventEmitter = require('events');

const devtools = require('./lib/devtools.js');
const CDPProxy = require('./lib/chrome.js');

function connect(options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = undefined;
    }
    const notifier = new EventEmitter();
    if (typeof callback === 'function') {
        // allow to register the error callback later
        process.nextTick(function () {
            new CDPProxy(options, notifier);
        });
        return notifier.on('connect', callback);
    } else {
        return new Promise(function (fulfill, reject) {
            notifier.on('connect', fulfill);
            notifier.on('error', reject);
            notifier.on('disconnect', function () {
                reject(new Error('Disconnected'));
            });
            new CDPProxy(options, notifier);
        });
    }
}

// for backward compatibility
module.exports = connect;
module.exports.listTabs = devtools.List;
module.exports.spawnTab = devtools.New;
module.exports.closeTab = devtools.Close;

module.exports.connect = connect;
module.exports.Protocol = devtools.Protocol;
module.exports.List = devtools.List;
module.exports.New = devtools.New;
module.exports.Activate = devtools.Activate;
module.exports.Close = devtools.Close;
module.exports.Version = devtools.Version;
