#!/usr/bin/env node

var repl = require('repl');
var ChromeInterface = require('../');

ChromeInterface(function (chrome) {
    var context = repl.start({
        'prompt': 'chrome> '
    }).context;

    for (var domain in chrome) {
        context[domain] = chrome[domain];
    }
});
