chrome-remote-interface
=======================

[Remote Debugging Protocol][1] interface that helps to instrument Chrome by
providing a simple abstraction of the two main objects exposed by the protocol
in a Node.js fashion: commands and notifications.

Installation
------------

    npm install chrome-remote-interface

Chrome setup
------------

Chrome needs to be started with the `--remote-debugging-port=<port>` option to
enable the [Remote Debugging Protocol][1], for example:

    google-chrome --remote-debugging-port=9222

Sample API usage
----------------

The following snippet loads `https://github.com` and dumps every request made.

```javascript
var Chrome = require('chrome-remote-interface');
Chrome(function (chrome) {
    with (chrome) {
        on('Network.requestWillBeSent', function (message) {
            console.log(message.request.url);
        });
        on('Page.loadEventFired', close);
        Network.enable();
        Page.enable();
        Page.navigate({'url': 'https://github.com'});
    }
}).on('error', function () {
    console.error('Cannot connect to Chrome');
});
```

REPL interface and embedded documentation
-----------------------------------------

This module comes with a REPL interface that can be used to interactively
control Chrome (run with `--help` to display the list of available options). It
supports command execution and event binding, see the documentation for
`chrome.Domain.method([params], [callback])` and
`chrome.Domain.event(callback)`. Here's a sample session:

```javascript
chrome> Network.enable()
chrome> Network.requestWillBeSent(console.log)
chrome> Page.navigate({url: 'https://github.com'})
```

Using the provided `help` field it's possible to obtain information on the
events and methods available through the [Remote Debugging Protocol][1]. For
example to learn how to call `Page.navigate` type:

```javascript
chrome> Page.navigate.help
{ name: 'navigate',
  parameters:
   [ { name: 'url',
       type: 'string',
       description: 'URL to navigate the page to.' } ],
  description: 'Navigates current page to the given URL.' }
```

For what concerns the types instead, just type its name:

```javascript
chrome> Network.Timestamp
{ id: 'Timestamp',
  type: 'number',
  description: 'Number of seconds since epoch.' }
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
  array returned by `http://host:port/json` containing the tab list and must
  return the numeric index of a tab. Defaults to a function that returns the
  active one (`function (tabs) { return 0; }`).

`callback` is a listener automatically added to the `connect` event of the
returned `EventEmitter`.

Returns an `EventEmitter` that supports the following events:

#### Event: 'connect'

    function (chrome) {}

Emitted when the connection to Chrome is established.

`chrome` is an instance of the `Chrome` class.

#### Event: 'error'

    function (err) {}

Emitted if `http://host:port/json` can't be reached or if it's not possible to
connect to Chrome's remote debugging WebSocket.

`err` is an instance of `Error`.

### module.listTabs([options], callback)

Request the list of the available open tabs of the remote Chrome instance.

`options` is an object with the following optional properties:

- `host`: [Remote Debugging Protocol][1] host. Defaults to `localhost`;
- `port`: [Remote Debugging Protocol][1] port. Defaults to `9222`.

`callback` is executed when the list is correctly received, it gets the
following arguments:

- `err`: a `Error` object indicating the success status;
- `tabs`: the array returned by `http://host:port/json` containing the tab list.

For example:

```javascript
var Chrome = require('chrome-remote-interface');
Chrome.listTabs(function (err, tabs) {
    if (!err) {
        console.log(tabs);
    }
});
```

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
notifications (see the documentation of `event`), for example:

    chrome.on('Network.requestWillBeSent', console.log);

#### chrome.send(method, [params], [callback])

Issue a command to Chrome.

`method` is a string describing the message.

`params` is an object containing the payload.

`callback` is executed when Chrome sends a response to this command, it gets the
following arguments:

- `error`: a boolean value indicating the success status, as reported by Chrome;
- `response`: an object containing either the response sent from Chrome
  (`result` field, if `error === false`) or the indication of the error (`error`
  field, if `error === true`).

Note that the field `id` mentioned in the [Remote Debugging Protocol
specifications][1] is managed internally and it's not exposed to the user.

#### chrome.Domain.method([params], [callback])

Just a shorthand for:

    chrome.send('Domain.method', params, callback);

For example:

    chrome.Page.navigate({'url': 'https://github.com'});

#### chrome.Domain.event(callback)

Just a shorthand for:

    chrome.on('Domain.event', callback);

For example:

    chrome.Network.requestWillBeSent(console.log);

#### chrome.close()

Close the connection to Chrome.

Contributors
------------

- [Andrey Sidorov](https://github.com/sidorares)

Resources
---------

- [Chrome Developer Tools: Remote Debugging Protocol v1.1][1]

[1]: https://developers.google.com/chrome-developer-tools/docs/protocol/1.1/
