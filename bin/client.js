#!/usr/bin/env node

var repl = require('repl');
var util = require('util');
var fs = require('fs');

var program = require('commander');
var Chrome = require('../');

function display(object) {
    return util.inspect(object, {
        'colors': process.stdout.isTTY,
        'depth': null
    });
}

function inheritProperties(from, to) {
    for (var property in from) {
        to[property] = from[property];
    }
}

///

function inspect(options, args) {
    if (args.webSocket) {
        options.chooseTab = args.webSocket;
    }

    if (args.protocol) {
        options.protocol = JSON.parse(fs.readFileSync(args.protocol));
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
            var override = function (filter) {
                // remove all the listeners (just one actually) anyway
                chrome.removeAllListeners(eventName);
                var status = {};
                // a filter will always enable/update the listener
                if (!filter && registeredEvents[eventName]) {
                    delete registeredEvents[eventName];
                    status[eventName] = false;
                } else {
                    // use the filter (or true) as a status token
                    var statusToken = (filter ? filter.toString() : true);
                    status[eventName] = registeredEvents[eventName] = statusToken;
                    event(function (message) {
                        var repr = {};
                        if (filter) {
                            message = filter(message);
                        }
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

        // exit on disconnection
        this.on('disconnect', function () {
            console.error('Disconnected.');
            process.exit(1);
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
        console.error('Cannot connect to Chrome:', err.toString());
    });
}

function list(options, args) {
    Chrome.List(options, function (err, tabs) {
        if (err) {
            console.error(err.toString());
            process.exit(1);
        }
        console.log(display(tabs));
    });
}

function _new(options, args) {
    options.url = args;
    Chrome.New(options, function (err, tab) {
        if (err) {
            console.error(err.toString());
            process.exit(1);
        }
        console.log(display(tab));
    });
}

function activate(options, args) {
    options.id = args;
    Chrome.Activate(options, function (err) {
        if (err) {
            console.error(err.toString());
            process.exit(1);
        }
    });
}

function close(options, args) {
    options.id = args;
    Chrome.Close(options, function (err) {
        if (err) {
            console.error(err.toString());
            process.exit(1);
        }
    });
}

function version(options, args) {
    Chrome.Version(options, function (err, info) {
        if (err) {
            console.error(err.toString());
            process.exit(1);
        }
        console.log(display(info));
    });
}

function protocol(options, args) {
    options.remote = args.remote;
    Chrome.Protocol(options, function (err, protocol) {
        if (err) {
            console.error(err.toString());
            process.exit(1);
        }
        console.log(display(protocol));
    });
}

///

var action;
var actionArguments;

program
    .option('-t, --host <host>', 'HTTP frontend host')
    .option('-p, --port <port>', 'HTTP frontend port');

program
    .command('inspect')
    .description('inspect a Remote Debugging Protocol target')
    .option('-w, --web-socket <url>', 'WebSocket URL')
    .option('-j, --protocol <file.json>', 'Remote Debugging Protocol descriptor')
    .action(function (args) {
        action = inspect;
        actionArguments = args;
    });

program
    .command('list')
    .description('list all the available tabs')
    .action(function () {
        action = list;
    });

program
    .command('new [<url>]')
    .description('create a new tab')
    .action(function (args) {
        action = _new;
        actionArguments = args;
    });

program
    .command('activate <id>')
    .description('activate a tab by id')
    .action(function (args) {
        action = activate;
        actionArguments = args;
    });

program
    .command('close <id>')
    .description('close a tab by id')
    .action(function (args) {
        action = close;
        actionArguments = args;
    });

program
    .command('version')
    .description('show the browser version')
    .action(function () {
        action = version;
    });

program
    .command('protocol')
    .description('show the currently available protocol descriptor')
    .option('-r, --remote', 'Attempt to fetch the protocol descriptor remotely')
    .action(function (args) {
        action = protocol;
        actionArguments = args;
    });

program.parse(process.argv);

// common options
var options = {
    'host': program.host,
    'port': program.port
};

if (action) {
    action(options, actionArguments);
} else {
    program.outputHelp();
    process.exit(1);
}
