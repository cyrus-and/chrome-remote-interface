'use strict';

const EventEmitter = require('events');

const devtools = require('./lib/devtools');
const Chrome = require('./lib/chrome');

module.exports = function (options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = undefined;
    }
    const notifier = new EventEmitter();
    if (typeof callback === 'function') {
        // allow to register the error callback later
        process.nextTick(function () {
            new Chrome(options, notifier);
        });
        return notifier.on('connect', callback);
    } else {
        return new Promise(function (fulfill, reject) {
            notifier.on('connect', fulfill);
            notifier.on('error', reject);
            notifier.on('disconnect', function () {
                reject(new Error('Disconnected'));
            });
            new Chrome(options, notifier);
        });
    }
};

// for backward compatibility
module.exports.listTabs = devtools.List;
module.exports.spawnTab = devtools.New;
module.exports.closeTab = devtools.Close;

module.exports.Protocol = devtools.Protocol;
module.exports.List = devtools.List;
module.exports.New = devtools.New;
module.exports.Activate = devtools.Activate;
module.exports.Close = devtools.Close;
module.exports.Version = devtools.Version;
