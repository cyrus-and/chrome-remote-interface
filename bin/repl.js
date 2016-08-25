#!/usr/bin/env node

var repl = require('repl');
var util = require('util');
var fs = require('fs');

var program = require('commander');
var Chrome = require('../');

program
    .option('-t, --host <host>', 'HTTP frontend host')
    .option('-p, --port <port>', 'HTTP frontend port')
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
    chrome.protocol.domains.forEach(function (domainObject) {
        var domainName = domainObject.domain;
        chromeRepl.context[domainName] = chrome[domainName];
    });
}).on('error', function (err) {
    console.error('Cannot connect to Chrome:', err);
});
