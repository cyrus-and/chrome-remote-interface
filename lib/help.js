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

function addCommand(domainName, command) {
    const self = this;
    const handler = function (params, callback) {
        return self.send(domainName + '.' + command.name, params, callback);
    };
    decorate(handler, 'command', command);
    self[domainName][command.name] = handler;
}

function addEvent(domainName, event) {
    const self = this;
    const handler = function (handler) {
        self.on(domainName + '.' + event.name, handler);
    };
    decorate(handler, 'event', event);
    self[domainName][event.name] = handler;
}

function addType(domainName, type) {
    const self = this;
    const help = {};
    decorate(help, 'type', type);
    self[domainName][type.id] = help;
}

function prepare() {
    const self = this;
    for (const domainIdx in self.protocol.domains) {
        const domain = self.protocol.domains[domainIdx];
        const domainName = domain.domain;
        self[domainName] = {};
        // add commands
        const commands = domain.commands;
        if (commands) {
            for (const commandIdx in commands) {
                const command = commands[commandIdx];
                addCommand.call(self, domainName, command);
            }
        }
        // add events
        const events = domain.events;
        if (events) {
            for (const eventIdx in events) {
                const event = events[eventIdx];
                addEvent.call(self, domainName, event);
            }
        }
        // add types
        const types = domain.types;
        if (types) {
            for (const typeIdx in types) {
                const type = types[typeIdx];
                addType.call(self, domainName, type);
            }
        }
    }
}

module.exports.prepare = prepare;
