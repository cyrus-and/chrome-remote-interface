#!/usr/bin/env node

var repl = require('repl');
var util = require('util');
var program = require('commander');
var fs = require('fs');
var Chrome = require('../');

program
    .option('-t, --host <host>', 'Remote Debugging Protocol host')
    .option('-p, --port <port>', 'Remote Debugging Protocol port')
    .option('-j, --protocol <file.json>', 'Remote Debugging Protocol descriptor')
    .parse(process.argv);

var options = {
    'host': program.host,
    'port': program.port
};

if (program.protocol) {
    options.protocol = JSON.parse(fs.readFileSync(program.protocol));
}

Chrome(options, function (chrome) {
    var chromeRepl = repl.start({
        'prompt': 'chrome> ',
        'ignoreUndefined': true,
        'writer': function (object) {
            return util.inspect(object, {
                'colors': true,
                'depth': null
            });
        }
    });

    // disconnect on exit
    chromeRepl.on('exit', function () {
        chrome.close();
    });

    // add protocol API
    for (var domainIdx in chrome.protocol.domains) {
        var domainName = chrome.protocol.domains[domainIdx].domain;
        chromeRepl.context[domainName] = chrome[domainName];
    }
}).on('error', function () {
    console.error('Cannot connect to Chrome');
});
