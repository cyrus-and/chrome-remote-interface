var defaults = require('./defaults.js');
var util = require('util');
var http = require('http');
var https = require('https');

// callback(err, protocol)
module.exports.Protocol = promisesWrapper(function (options, callback) {
    var localProtocol = require('./protocol.json');
    var protocol = {'remote': false, 'descriptor': localProtocol};
    // if the local protocol is explicitly requested
    if (!options.remote) {
        callback(null, protocol);
        return;
    }
    // try to fecth the browser version informaion
    module.exports.Version(options, function (err, info) {
        if (err) {
            callback(null, protocol);
            return;
        }
        // use the proper protocol fetcher
        var fetcher;
        if (info.Browser.startsWith('Chrome/')) {
            fetcher = fetchFromChrome;
        } else if (info.Browser.startsWith('Microsoft Edge ')) {
            fetcher = fetchFromEdge;
        } else {
            callback(null, protocol);
            return;
        }
        fetcher(options, info, function (descriptor) {
            if (descriptor) {
                protocol.remote = true;
                protocol.descriptor = descriptor;
            }
            callback(null, protocol);
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
    var request = transport.get(options, function (response) {
        var data = '';
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

// callback(protocol)
// XXX this function needs a proper refactor but the inconsistency of the
// fetching process makes it useless for now
function fetchFromChrome(options, info, callback) {
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
    var webKitVersion = info['WebKit-Version'];
    var match = webKitVersion.match(/\s\(@(\b[0-9a-f]{5,40}\b)/);
    var hash = match[1];
    var fromChromiumDotOrg = (hash <= 202666);
    var templates;
    if (fromChromiumDotOrg) {
        templates = ['https://src.chromium.org/blink/trunk/Source/devtools/protocol.json?p=%s'];
    } else {
        var chromeVersion = explodeVersion(info.Browser.split('/')[1]);
        var lastChromeVersion = explodeVersion('53.0.2758.1'); // before the split (https://crbug.com/580337)
        // according to https://www.chromium.org/developers/version-numbers
        var beforeSplit = (chromeVersion[2] <= lastChromeVersion[2]); // patch not meaningful
        templates = (beforeSplit ?
            ['https://chromium.googlesource.com/chromium/src/+/%s/third_party/WebKit/Source/devtools/protocol.json?format=TEXT'] :
            ['https://chromium.googlesource.com/chromium/src/+/%s/third_party/WebKit/Source/core/inspector/browser_protocol.json?format=TEXT',
             'https://chromium.googlesource.com/chromium/src/+/%s/third_party/WebKit/Source/platform/v8_inspector/js_protocol.json?format=TEXT']);
    }
    var urls = templates.map(function (template) {
        return util.format(template, hash);
    });
    var descriptors = [];
    urls.forEach(function (url) {
        fetchObject(https, url, function (err, data) {
            var descriptor; // undefined == fallback
            if (!err) {
                try {
                    // the file is served base64 encoded from googlesource.com
                    if (!fromChromiumDotOrg) {
                        data = new Buffer(data, 'base64').toString();
                    }
                    descriptor = JSON.parse(data);
                } catch (_) {
                    // fall back
                }
            }
            descriptors.push(descriptor);
            if (descriptors.length === urls.length) {
                // all must be defined
                if (descriptors.indexOf(undefined) !== -1) {
                    callback();
                    return;
                }
                // merge the domains
                descriptors.forEach(function (descriptor, i) {
                    if (i === 0) {
                        return;
                    }
                    Array.prototype.push.apply(descriptors[0].domains, descriptor.domains);
                });
                callback(descriptors[0]);
            }
        });
    });
}

function fetchFromEdge(options, info, callback) {
    options.path = '/json/protocol';
    devToolsInterface(options, function (err, descriptor) {
        if (err) {
            callback();
        } else {
            callback(JSON.parse(descriptor));
        }
    });
}
