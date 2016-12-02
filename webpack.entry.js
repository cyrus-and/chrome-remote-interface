// WebSocket wrapper used by the browser
window.ws = require('./lib/websocket-wrapper.js');

// export the whole module
module.exports = require('./index.js'); // XXX cannot simply use '.'
