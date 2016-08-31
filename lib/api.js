function arrayToObject(parameters) {
    const keyValue = {};
    parameters.forEach(function (parameter) {
        const name = parameter.name;
        delete parameter.name;
        keyValue[name] = parameter;
    });
    return keyValue;
}

function decorate(to, category, object) {
    to.category = category;
    for (const field in object) {
        // commands and events have parameters whereas types have properties
        if (category === 'type' && field === 'properties' ||
            field === 'parameters') {
            to[field] = arrayToObject(object[field]);
        } else {
            to[field] = object[field];
        }
    }
}

function addCommand(chrome, domainName, command) {
    const handler = function (params, callback) {
        return chrome.send(domainName + '.' + command.name, params, callback);
    };
    decorate(handler, 'command', command);
    chrome[domainName][command.name] = handler;
}

function addEvent(chrome, domainName, event) {
    const handler = function (handler) {
        chrome.on(domainName + '.' + event.name, handler);
    };
    decorate(handler, 'event', event);
    chrome[domainName][event.name] = handler;
}

function addType(chrome, domainName, type) {
    const help = {};
    decorate(help, 'type', type);
    chrome[domainName][type.id] = help;
}

function prepare(protocol) {
    const chrome = this;
    return new Promise(function (fulfill, reject) {
        // assign the protocol and generate the shorthands
        chrome.protocol = protocol;
        for (const domainIdx in protocol.domains) {
            const domain = protocol.domains[domainIdx];
            const domainName = domain.domain;
            chrome[domainName] = {};
            // add commands
            const commands = domain.commands;
            if (commands) {
                for (const commandIdx in commands) {
                    const command = commands[commandIdx];
                    addCommand(chrome, domainName, command);
                }
            }
            // add events
            const events = domain.events;
            if (events) {
                for (const eventIdx in events) {
                    const event = events[eventIdx];
                    addEvent(chrome, domainName, event);
                }
            }
            // add types
            const types = domain.types;
            if (types) {
                for (const typeIdx in types) {
                    const type = types[typeIdx];
                    addType(chrome, domainName, type);
                }
            }
        }
        fulfill();
    });
}

module.exports.prepare = prepare;
