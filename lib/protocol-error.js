'use strict';

class ProtocolError extends Error {
    constructor(response) {
        super(response.message);
        Object.assign(this, response);
    }
}

module.exports = ProtocolError;
