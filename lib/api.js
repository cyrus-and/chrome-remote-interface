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
    const commandName = `${domainName}.${command.name}`;
    const handler = (params, sessionId, callback) => {
        return chrome.send(commandName, params, sessionId, callback);
    };
    decorate(handler, 'command', command);
    chrome[commandName] = chrome[domainName][command.name] = handler;
}

function addEvent(chrome, domainName, event) {
    const eventName = `${domainName}.${event.name}`;
    const handler = (sessionId, handler) => {
        if (typeof sessionId === 'function') {
            handler = sessionId;
            sessionId = undefined;
        }
        const rawEventName = sessionId ? `${eventName}.${sessionId}` : eventName;
        if (typeof handler === 'function') {
            chrome.on(rawEventName, handler);
            return () => chrome.removeListener(rawEventName, handler);
        } else {
            return new Promise((fulfill, reject) => {
                if (chrome._ws.readyState !== 1) { // WebSocket.OPEN = 1
                    return reject(new Error('client disconnected'));
                }
                const onEvent = function () {
                    chrome._ws.removeListener('close', onClose);
                    fulfill.apply(null, arguments);
                };
                const onClose = () => {
                    chrome.removeListener(rawEventName, onEvent);
                    reject(new Error('client disconnected'));
                };
                chrome.once(rawEventName, onEvent);
                // note: can't listen on client 'disconnect' event because it's not emitted on user-initiated close
                chrome._ws.once('close', onClose);
            });
        }
    };
    decorate(handler, 'event', event);
    chrome[eventName] = chrome[domainName][event.name] = handler;
}

function addType(chrome, domainName, type) {
    const typeName = `${domainName}.${type.id}`;
    const help = {};
    decorate(help, 'type', type);
    chrome[typeName] = chrome[domainName][type.id] = help;
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
        // add utility listener for each domain
        object[domainName].on = (eventName, handler) => {
            return object[domainName][eventName](handler);
        };
    });
}

module.exports.prepare = prepare;
