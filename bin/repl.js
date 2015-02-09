#!/usr/bin/env node

var repl = require('repl');
var program = require('commander');
var defaults = require('./defaults.js');
var protocol = require('../lib/protocol.json');
var Chrome = require('../');

program
    .option('-h, --host <host>', 'Remote Debugging Protocol host', defaults.HOST)
    .option('-p, --port <port>', 'Remote Debugging Protocol port', defaults.PORT)
    .parse(process.argv);

var options = {
    'host': program.host,
    'port': program.port
};

Chrome(options, function (chrome) {
    var chromeRepl = repl.start({
        'prompt': 'chrome> ',
        'ignoreUndefined': true
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
}).on('error', function () {
    console.error('Cannot connect to Chrome');
});
