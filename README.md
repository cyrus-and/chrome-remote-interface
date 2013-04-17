chrome-remote-interface
=======================

Chrome [Remote Debugging Protocol][1] interface.

Installation
------------

    npm install chrome-remote-interface

Chrome setup
------------

Chrome needs to be started with the `--remote-debugging-port=<port>` option to
enable the [Remote Debugging Protocol][1] on the specified port, for example:

    google-chrome --remote-debugging-port=9222 --enable-benchmarking

Sample usage
------------

The following snippet loads `https://github.com` and dumps every request made.

```javascript
var Chrome = require('chrome-remote-interface');
Chrome(function (chrome) {
    chrome.on('Network.requestWillBeSent', function (message) {
        console.log(message.request.url);
    });
    chrome.on('Page.loadEventFired', function (message) {
        chrome.close();
    });
    chrome.send('Network.enable');
    chrome.send('Page.enable');
    chrome.send('Page.navigate', {'url': 'https://github.com'});
}).on('error', function () {
    console.log('Cannot connect to Chrome');
});
```

API
---

### module([options], [callback])

Connects to a remote instance of Chrome using the [Remote Debugging
Protocol][1].

`options` is an object with the following optional properties:

- `host`: [Remote Debugging Protocol][1] host. Defaults to `localhost`;
- `port`: [Remote Debugging Protocol][1] port. Defaults to `9222`;
- `chooseTab`: callback used to determine which remote tab attach to. Takes the
  JSON array returned by `http://host:port/json` containing the tab list and
  must return the numeric index of a tab. Defaults to a function that returns
  the active one (`function (tabs) { return 0; }`).

`callback` is a listener automatically added to the `connect` event of the
returned `EventEmitter`.

Returns an `EventEmitter` that supports the following events:

#### Event: 'connect'

    function (chrome) {}

Emitted when the connection to Chrome is established.

`chrome` is an instance of the `Chrome` class.

#### Event: 'error'

    function (error) {}

Emitted if `http://host:port/json` can't be reached or if it's not possible to
connect to Chrome's remote debugging WebSocket.

### Class: Chrome

#### Event: 'event'

    function (message) {}

Emitted when Chrome sends a notification through the WebSocket.

`message` is the object received, it has the following properties:

- `method`: a string describing the message.
- `params`: an object containing the payload.

Refer to the [Remote Debugging Protocol specifications][1] for more information.

#### Event: method

    function (params) {}

Emitted when Chrome sends a notification classified as `method` through the
WebSocket.

`params` is an object containing the payload.

This is just a utility event that allows to easily filter out specific
notifications (see the documentation of `event`).

#### chrome.send(method, [params], [callback])

Issue a command to Chrome.

`method` is a string describing the message.

`params` is an object containing the payload.

`callback` is executed when Chrome sends a response to this command, it gets the
following arguments:

- `error`: a boolean value indicating the success status;
- `response`: an object containing either the response sent from Chrome or the
  indication of the error.

#### chrome.close()

Close the connection to Chrome.

Resources
---------

- [Chrome Developer Tools: Remote Debugging Protocol v1.0][1]

[1]: https://developers.google.com/chrome-developer-tools/docs/protocol/1.0/
