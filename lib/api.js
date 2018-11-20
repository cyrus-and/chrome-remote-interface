'use strict';

function arrayToObject(parameters) {
    const keyValue = {};
    parameters.forEach((parameter) =>{
        const name = parameter.name;
        delete parameter.name;
        keyValue[name] = parameter;
    });
    return keyValue;
}

function decorate(to, category, object) {
    to.category = category;
    Object.keys(object).forEach((field) => {
        // skip the 'name' field as it is part of the function prototype
        if (field === 'name') {
            return;
        }
        // commands and events have parameters whereas types have properties
        if (category === 'type' && field === 'properties' ||
            field === 'parameters') {
            to[field] = arrayToObject(object[field]);
        } else {
            to[field] = object[field];
        }
    });
}

function addCommand(chrome, domainName, command) {
    const handler = (params, callback) => {
        return chrome.send(`${domainName}.${command.name}`, params, callback);
    };
    decorate(handler, 'command', command);
    chrome[domainName][command.name] = handler;
}

function addEvent(chrome, domainName, event) {
    const eventName = `${domainName}.${event.name}`;
    const handler = (handler) => {
        if (typeof handler === 'function') {
            chrome.on(eventName, handler);
            return () => chrome.removeListener(eventName, handler);
        } else {
            return new Promise((fulfill, reject) => {
                chrome.once(eventName, fulfill);
            });
        }
    };
    decorate(handler, 'event', event);
    chrome[domainName][event.name] = handler;
}

function addType(chrome, domainName, type) {
    const help = {};
    decorate(help, 'type', type);
    chrome[domainName][type.id] = help;
}

function prepare(object, protocol) {
    // assign the protocol and generate the shorthands
    object.protocol = protocol;
    protocol.domains.forEach((domain) => {
        const domainName = domain.domain;
        object[domainName] = {};
        // add commands
        (domain.commands || []).forEach((command) => {
            addCommand(object, domainName, command);
        });
        // add events
        (domain.events || []).forEach((event) => {
            addEvent(object, domainName, event);
        });
        // add types
        (domain.types || []).forEach((type) => {
            addType(object, domainName, type);
        });
    });
}

module.exports.prepare = prepare;
