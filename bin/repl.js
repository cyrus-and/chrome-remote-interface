#!/usr/bin/env node

var repl = require('repl');
var protocol = require('../lib/Inspector.json');
var Chrome = require('../');

Chrome(function (chrome) {
    var chromeRepl = repl.start({
        'prompt': 'chrome> '
    });

    // disconnect on exit
    chromeRepl.on('exit', function () {
        chrome.close();
    });

    // add protocol API
    for (var domainIdx in protocol.domains) {
        var domainName = protocol.domains[domainIdx].domain;
        chromeRepl.context[domainName] = chrome[domainName];
    }
});
