#!/usr/bin/env node

var repl = require('repl');
var ChromeInterface = require('../');

ChromeInterface(function (chrome) {
    var chromeRepl = repl.start({
        'prompt': 'chrome> '
    });

    chromeRepl.on('exit', function() {
        chrome.close();
    });

    for (var domain in chrome) {
        chromeRepl.context[domain] = chrome[domain];
    }
});
