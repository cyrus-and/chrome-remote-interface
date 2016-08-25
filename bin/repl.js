#!/usr/bin/env node

var repl = require('repl');
var util = require('util');
var fs = require('fs');

var program = require('commander');
var Chrome = require('../');

function display(object) {
    return util.inspect(object, {
        'colors': true,
        'depth': null
    });
}

function inheritProperties(from, to) {
    for (var property in from) {
        to[property] = from[property];
    }
}

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
    // keep track of registered events
    var registeredEvents = {};

    var chromeRepl = repl.start({
        'prompt': '>>> ',
        'ignoreUndefined': true,
        'writer': display
    });

    function overridePrompt(string) {
        // hack to get rid of the prompt (clean line and reposition cursor)
        console.log('\033[2K\033[G%s', string);
        chromeRepl.displayPrompt(true);
    }

    function overrideCommand(command) {
        // hard code a callback to display the result
        var override = function (params) {
            command(params, function (error, response) {
                var repr = {};
                repr[error ? 'error' : 'result'] = response;
                overridePrompt(display(repr));
            });
        };
        // inherit the doc decorations
        inheritProperties(command, override);
        return override;
    }

    function overrideEvent(chrome, domainName, itemName) {
        var event = chrome[domainName][itemName];
        var eventName = domainName + '.' + itemName;
        // hard code a callback to display the event data
        var override = function () {
            var status = {};
            if (registeredEvents[eventName]) {
                chrome.removeAllListeners(eventName);
                delete registeredEvents[eventName];
                status[eventName] = false;
            } else {
                status[eventName] = registeredEvents[eventName] = true;
                event(function (message) {
                    var repr = {};
                    repr[eventName] = message;
                    overridePrompt(display(repr));
                });
            }
            // show the registration status to the user
            return status;
        };
        // inherit the doc decorations
        inheritProperties(event, override);
        return override;
    }

    // disconnect on exit
    chromeRepl.on('exit', function () {
        chrome.close();
    });

    // add protocol API
    chrome.protocol.domains.forEach(function (domainObject) {
        // walk the domain names
        var domainName = domainObject.domain;
        chromeRepl.context[domainName] = {};
        for (var itemName in chrome[domainName]) {
            // walk the items in the domain and override commands and events
            var item = chrome[domainName][itemName];
            switch (item.category) {
            case 'command':
                item = overrideCommand(item);
                break;
            case 'event':
                item = overrideEvent(chrome, domainName, itemName);
                break;
            }
            chromeRepl.context[domainName][itemName] = item;
        }
    });
}).on('error', function (err) {
    console.error('Cannot connect to Chrome:', err);
});
