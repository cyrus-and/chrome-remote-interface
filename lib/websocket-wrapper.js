const EventEmitter = require('events');

// wrapper around the Node.js ws module
// for use in browsers
class WebSocketWrapper extends EventEmitter {
    constructor(url) {
        super();
        this._ws = new WebSocket(url);
        this._ws.onopen = () => {
            this.emit('open');
        };
        this._ws.onclose = () => {
            this.emit('close');
        };
        this._ws.onmessage = (message) => {
            this.emit('message', message.data);
        };
        this._ws.onerror = (err) => {
            this.emit('error', err);
        };
    }

    close() {
        this._ws.close();
    }

    send(data) {
        this._ws.send(data);
    }
}

module.exports = WebSocketWrapper;
