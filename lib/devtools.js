'use strict';

const http = require('http');
const https = require('https');
const util = require('util');

const defaults = require('./defaults.js');

// callback(err, protocol)
module.exports.Protocol = promisesWrapper(function (options, callback) {
    // if the local protocol is requested
    if (!options.remote) {
        const localDescriptor = require('./protocol.json');
        callback(null, {
            'remote': false,
            'descriptor': localDescriptor
        });
        return;
    }
    // try to fecth the browser version information and the protocol (remotely)
    module.exports.Version(options, function (err, info) {
        if (err) {
            callback(err);
            return;
        }
        // fetch the reported browser info (Node.js returns an array)
        const browser = (info[0] || info).Browser;
        // use the proper protocol fetcher
        let fetcher;
        if (browser.match(/^Chrome\//)) {
            fetcher = fetchFromChromeRepo;
        } else if (browser.match(/^Microsoft Edge /)) {
            fetcher = fetchFromHttpEndpoint;
        } else if (browser.match(/^node.js\//)) {
            fetcher = fetchFromHttpEndpoint;
        } else {
            callback(new Error('Unknown implementation'));
            return;
        }
        fetcher(options, info, function (err, descriptor) {
            if (err) {
                callback(err);
                return;
            }
            // use the remotely fetched descriptor
            callback(null, {
                'remote': true,
                'descriptor': descriptor
            });
        });
    });
});

module.exports.List = promisesWrapper(function (options, callback) {
    options.path = '/json/list';
    devToolsInterface(options, function (err, tabs) {
        if (err) {
            callback(err);
        } else {
            callback(null, JSON.parse(tabs));
        }
    });
});

module.exports.New = promisesWrapper(function (options, callback) {
    options.path = '/json/new';
    if (Object.prototype.hasOwnProperty.call(options, 'url')) {
        options.path += '?' + options.url;
    }
    devToolsInterface(options, function (err, tab) {
        if (err) {
            callback(err);
        } else {
            callback(null, JSON.parse(tab));
        }
    });
});

module.exports.Activate = promisesWrapper(function (options, callback) {
    options.path = '/json/activate/' + options.id;
    devToolsInterface(options, function (err) {
        if (err) {
            callback(err);
        } else {
            callback(null);
        }
    });
});

module.exports.Close = promisesWrapper(function (options, callback) {
    options.path = '/json/close/' + options.id;
    devToolsInterface(options, function (err) {
        if (err) {
            callback(err);
        } else {
            callback(null);
        }
    });
});

module.exports.Version = promisesWrapper(function (options, callback) {
    options.path = '/json/version';
    devToolsInterface(options, function (err, versionInfo) {
        if (err) {
            callback(err);
        } else {
            callback(null, JSON.parse(versionInfo));
        }
    });
});

// options.path must be specified; callback(err, data)
function devToolsInterface(options, callback) {
    options.host = options.host || defaults.HOST;
    options.port = options.port || defaults.PORT;
    fetchObject(http, options, callback);
}

// wrapper that allows to return a promise if the callback is omitted, it works
// for DevTools methods
function promisesWrapper(func) {
    return function (options, callback) {
        // options is an optional argument
        if (typeof options === 'function') {
            callback = options;
            options = undefined;
        }
        options = options || {};
        // just call the function otherwise wrap a promise around its execution
        if (typeof callback === 'function') {
            func(options, callback);
        } else {
            return new Promise(function (fulfill, reject) {
                func(options, function (err, result) {
                    if (err) {
                        reject(err);
                    } else {
                        fulfill(result);
                    }
                });
            });
        }
    };
}

// callback(err, data)
function fetchObject(transport, options, callback) {
    const request = transport.get(options, function (response) {
        let data = '';
        response.on('data', function (chunk) {
            data += chunk;
        });
        response.on('end', function () {
            if (response.statusCode === 200) {
                callback(null, data);
            } else {
                callback(new Error(data));
            }
        });
    });
    request.on('error', function (err) {
        callback(err);
    });
}

// callback(err, descriptor)
// XXX this function needs a proper refactor but the inconsistency of the
// fetching process makes it useless for now
function fetchFromChromeRepo(options, info, callback) {
    function explodeVersion(v) {
        return v.split('.').map(function (x) {
            return parseInt(x);
        });
    }
    // attempt to fetch the protocol directly from the Chromium repository
    // according to the current version
    //
    // Thanks to Paul Irish.
    // (see https://github.com/cyrus-and/chrome-remote-interface/issues/10#issuecomment-146032907)
    const webKitVersion = info['WebKit-Version'];
    const match = webKitVersion.match(/\s\(@(\b[0-9a-f]{5,40}\b)/);
    const hash = match[1];
    const fromChromiumDotOrg = (hash <= 202666);
    let templates;
    if (fromChromiumDotOrg) {
        templates = ['https://src.chromium.org/blink/trunk/Source/devtools/protocol.json?p=%s'];
    } else {
        const chromeVersion = explodeVersion(info.Browser.split('/')[1]);
        const lastChromeVersion = explodeVersion('53.0.2758.1'); // before the split (https://crbug.com/580337)
        // according to https://www.chromium.org/developers/version-numbers
        const beforeSplit = (chromeVersion[2] <= lastChromeVersion[2]); // patch not meaningful
        templates = (beforeSplit ?
            ['https://chromium.googlesource.com/chromium/src/+/%s/third_party/WebKit/Source/devtools/protocol.json?format=TEXT'] :
            ['https://chromium.googlesource.com/chromium/src/+/%s/third_party/WebKit/Source/core/inspector/browser_protocol.json?format=TEXT',
             'https://chromium.googlesource.com/chromium/src/+/%s/third_party/WebKit/Source/platform/v8_inspector/js_protocol.json?format=TEXT']);
    }
    const urls = templates.map(function (template) {
        return util.format(template, hash);
    });
    const descriptors = [];
    urls.forEach(function (url) {
        fetchObject(https, url, function (err, data) {
            let descriptor;
            if (!err) {
                try {
                    // the file is served base64 encoded from googlesource.com
                    if (!fromChromiumDotOrg) {
                        data = new Buffer(data, 'base64').toString();
                    }
                    descriptor = JSON.parse(data);
                } catch (_) {
                    // abort later
                }
            }
            descriptors.push(descriptor);
            if (descriptors.length === urls.length) {
                // all must be defined
                if (descriptors.indexOf(undefined) !== -1) {
                    callback(new Error('Cannot fetch from Chromium repo'));
                    return;
                }
                // merge the domains
                descriptors.forEach(function (descriptor, i) {
                    if (i === 0) {
                        return;
                    }
                    Array.prototype.push.apply(descriptors[0].domains, descriptor.domains);
                });
                callback(null, descriptors[0]);
            }
        });
    });
}

// callback(err, descriptor)
function fetchFromHttpEndpoint(options, info, callback) {
    options.path = '/json/protocol';
    devToolsInterface(options, function (err, descriptor) {
        if (err) {
            callback(err);
        } else {
            callback(null, JSON.parse(descriptor));
        }
    });
}
