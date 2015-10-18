chrome-remote-interface
=======================

[Remote Debugging Protocol][rdb] interface that helps to instrument Chrome by
providing a simple abstraction of the two main objects exposed by the protocol
in a Node.js fashion: commands and notifications.

`chrome-remote-interface` is listed among
[third-party Chrome debugging protocol clients][clients-cri].

Installation
------------

    npm install chrome-remote-interface

Chrome setup
------------

Chrome needs to be started with the `--remote-debugging-port=<port>` option to
enable the [Remote Debugging Protocol][rdb], for example:

    google-chrome --remote-debugging-port=9222

Sample API usage
----------------

The following snippet loads `https://github.com` and dumps every request made.

```javascript
var Chrome = require('chrome-remote-interface');
Chrome(function (chrome) {
    with (chrome) {
        Network.requestWillBeSent(function (params) {
            console.log(params.request.url);
        });
        Page.loadEventFired(close);
        Network.enable();
        Page.enable();
        once('ready', function () {
            Page.navigate({'url': 'https://github.com'});
        });
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
`chrome.<domain>.<method>([params], [callback])` and
`chrome.<domain>.<event>(callback)`. Here's a sample session:

```javascript
chrome> Network.enable()
chrome> Network.requestWillBeSent(console.log)
chrome> Page.navigate({url: 'https://github.com'})
```

Using the provided `help` field it's possible to obtain information on the
events and methods available through the [Remote Debugging Protocol][rdb]. For
example to learn how to call `Page.navigate` type:

```javascript
chrome> Page.navigate.help
{ type: 'command',
  name: 'navigate',
  parameters:
   [ { name: 'url',
       type: 'string',
       description: 'URL to navigate the page to.' } ],
  returns:
   [ { name: 'frameId',
       '$ref': 'FrameId',
       hidden: true,
       description: 'Frame id that will be navigated.' } ],
  description: 'Navigates current page to the given URL.',
  handlers: [ 'browser', 'renderer' ] }
```

The `type` field determines whether this member is a `command` or an `event`.

For what concerns the types instead (they usually start with an upper case
letter), just type its name:

```javascript
chrome> Network.Timestamp
{ id: 'Timestamp',
  type: 'number',
  description: 'Number of seconds since epoch.' }
```

Remote Debugging Protocol versions
----------------------------------

Currently it is not possible to fetch the protocol descriptor
([`protocol.json`][local-json]) directly from the instrumented Chrome instance
(see [#10][issue]); rather, that file can be fetched from the proper [source
repository][remote-json] at every connection. By default, the [hardcoded local
version][local-json] is used.

To override the above behavior there are basically three options:

1. update the local copy with `make update-protocol`;

2. pass a custom protocol descriptor (use `null` to fetch it from the remote
   repository) upon
   [connection](https://github.com/cyrus-and/chrome-remote-interface#moduleoptions-callback);

3. use the *raw* version of the [commands](#chromesendmethod-params-callback)
   and [events](#event-method) interface.

API
---

### module([options], [callback])

Connects to a remote instance of Chrome using the [Remote Debugging
Protocol][rdb].

`options` is an object with the following optional properties:

- `host`: [Remote Debugging Protocol][rdb] host. Defaults to `localhost`;
- `port`: [Remote Debugging Protocol][rdb] port. Defaults to `9222`;
- `chooseTab`: Either a callback or a tab object (i.e. those returned by `New`
  and `List` methods). The callback is used to determine which remote tab attach
  to, it  takes the array returned by the `List` method and must return the
  numeric index of a tab. Defaults to a function which returns the currently
  active tab (`function (tabs) { return 0; }`).
- `protocol`: [Remote Debugging Protocol][rdb] descriptor object. Passing `null`
  causes the proper protocol descriptor to be fetched from the remote Chrome
  repository according to the version exposed by the instrumented Chrome
  instance, falling back to the default if that is not possible. Defaults to the
  [hardcoded local version][local-json].

`callback` is a listener automatically added to the `connect` event of the
returned `EventEmitter`.

Returns an `EventEmitter` that supports the following events:

#### Event: 'connect'

```javascript
function (chrome) {}
```

Emitted when the connection to Chrome is established.

`chrome` is an instance of the `Chrome` class.

#### Event: 'error'

```javascript
function (err) {}
```

Emitted if `http://host:port/json` can't be reached or if it's not possible to
connect to Chrome's remote debugging WebSocket.

`err` is an instance of `Error`.

### module.Protocol([options], callback)

Fetch the [Remote Debugging Protocol][rdb] descriptor from the Chrome repository
according to the version of the remote Chrome instance, or fall back to the
local hardcoded version if not available.

`options` is an object with the following optional properties:

- `host`: [Remote Debugging Protocol][rdb] host. Defaults to `localhost`;
- `port`: [Remote Debugging Protocol][rdb] port. Defaults to `9222`.

`callback` is executed when the protocol is fetched, it gets the following
arguments:

- `err`: a `Error` object indicating the success status;
- `fromChrome`: a boolean indicating whether the protocol has been fetched from
  the Chrome repository or not;
- `protocol`: the [Remote Debugging Protocol][rdb] descriptor.

For example:

```javascript
var Chrome = require('chrome-remote-interface');
Chrome.Protocol(function (err, fromChrome, protocol) {
    if (!err) {
        console.log(JSON.stringify(protocol, null, 4));
    }
});
```

### module.List([options], callback)

Request the list of the available open tabs of the remote Chrome instance.

`options` is an object with the following optional properties:

- `host`: [Remote Debugging Protocol][rdb] host. Defaults to `localhost`;
- `port`: [Remote Debugging Protocol][rdb] port. Defaults to `9222`.

`callback` is executed when the list is correctly received, it gets the
following arguments:

- `err`: a `Error` object indicating the success status;
- `tabs`: the array returned by `http://host:port/json/list` containing the tab
  list.

For example:

```javascript
var Chrome = require('chrome-remote-interface');
Chrome.List(function (err, tabs) {
    if (!err) {
        console.log(tabs);
    }
});
```

### module.New([options], callback)

Create a new tab in the remote Chrome instance.

`options` is an object with the following optional properties:

- `host`: [Remote Debugging Protocol][rdb] host. Defaults to `localhost`;
- `port`: [Remote Debugging Protocol][rdb] port. Defaults to `9222`.
- `url`: [Remote Debugging Protocol][rdb] url. Defaults to `about:blank`.

`callback` is executed when the tab is created, it gets the
following arguments:

- `err`: a `Error` object indicating the success status;
- `tab`: the object returned by `http://host:port/json/new` containing the tab.

For example:

```javascript
var Chrome = require('chrome-remote-interface');
Chrome.New(function (err, tab) {
    if (!err) {
        console.log(tab);
    }
});
```

### module.Activate([options], callback)

Activate an open tab of the remote Chrome instance.

`options` is an object with the following properties:

- `host`: [Remote Debugging Protocol][rdb] host. Defaults to `localhost`;
- `port`: [Remote Debugging Protocol][rdb] port. Defaults to `9222`.
- `id`: [Remote Debugging Protocol][rdb] id. Required, no default.

`callback` is executed when the response to the activation request is
received. It gets the following arguments:

- `err`: a `Error` object indicating the success status;

For example:

```javascript
var Chrome = require('chrome-remote-interface');
Chrome.Activate({'id': 'CC46FBFA-3BDA-493B-B2E4-2BE6EB0D97EC'}, function (err) {
    if (!err) {
        console.log('success! tab is closing');
    }
});
```

### module.Close([options], callback)

Close an open tab of the remote Chrome instance.

`options` is an object with the following properties:

- `host`: [Remote Debugging Protocol][rdb] host. Defaults to `localhost`;
- `port`: [Remote Debugging Protocol][rdb] port. Defaults to `9222`.
- `id`: [Remote Debugging Protocol][rdb] id. Required, no default.

`callback` is executed when the response to the close request is
received. It gets the following arguments:

- `err`: a `Error` object indicating the success status;

For example:

```javascript
var Chrome = require('chrome-remote-interface');
Chrome.Close({'id': 'CC46FBFA-3BDA-493B-B2E4-2BE6EB0D97EC'}, function (err) {
    if (!err) {
        console.log('success! tab is closing');
    }
});
```

Note that the callback is fired when the tab is *queued* for removal,
but the actual removal will occur asynchronously. It typically takes
~200ms for this to occur.

### module.Version([options], callback)

Request version information from the remote Chrome instance.

`options` is an object with the following optional properties:

- `host`: [Remote Debugging Protocol][rdb] host. Defaults to `localhost`;
- `port`: [Remote Debugging Protocol][rdb] port. Defaults to `9222`.

`callback` is executed when the version information is correctly received, it
gets the following arguments:

- `err`: a `Error` object indicating the success status;
- `info`: a JSON object returned by `http://host:port/json/version` containing
  the version information.

For example:

```javascript
var Chrome = require('chrome-remote-interface');
Chrome.Version(function (err, info) {
    if (!err) {
        console.log(info);
    }
});
```

### Class: Chrome

#### Event: 'event'

```javascript
function (message) {}
```

Emitted when Chrome sends a notification through the WebSocket.

`message` is the object received, it has the following properties:

- `method`: a string describing the notification (e.g.,
  `'Network.requestWillBeSent'`).
- `params`: an object containing the payload.

Refer to the [Remote Debugging Protocol specifications][rdb] for more information.

For example:

```javascript
on('event', function (message) {
    if (message.method === 'Network.requestWillBeSent') {
        console.log(message.params);
    }
});
```

#### Event: '`<method>`'

```javascript
function (params) {}
```

Emitted when Chrome sends a notification for `<method>` through the WebSocket.

`params` is an object containing the payload.

This is just a utility event which allows to easily listen for specific
notifications (see the above event), for example:

```javascript
chrome.on('Network.requestWillBeSent', console.log);
```

#### Event: 'ready'

```javascript
function () {}
```

Emitted every time that there are no more pending commands waiting for a
response from Chrome. Note that the interaction with Chrome is asynchronous so
the only way to serialize a sequence of commands is to use the callback provided
by the `chrome.send` method. This event acts as a barrier and it is useful to
avoid the callback hell in certain simple situations.

For example to load a URL only after having enabled the notifications of both
`Network` and `Page` domains:

```javascript
Network.enable();
Page.enable();
once('ready', function() {
    Page.navigate({'url': 'https://github.com'});
});
```

In this particular case, not enforcing this kind of serialization may cause that
Chrome doesn't properly deliver the desired notifications the client.

#### chrome.send(method, [params], [callback])

Issue a command to Chrome.

`method` is a string describing the command.

`params` is an object containing the payload.

`callback` is executed when Chrome sends a response to this command, it gets the
following arguments:

- `error`: a boolean value indicating the success status, as reported by Chrome;
- `response`: an object containing either the response sent from Chrome
  (`result` field, if `error === false`) or the indication of the error (`error`
  field, if `error === true`).

Note that the field `id` mentioned in the [Remote Debugging Protocol
specifications][rdb] is managed internally and it's not exposed to the user.

For example:

```javascript
chrome.send('Page.navigate', {'url': 'https://github.com'}, console.log);
```

#### chrome.`<domain>`.`<method>`([params], [callback])

Just a shorthand for:

```javascript
chrome.send('<domain>.<method>', params, callback);
```

For example:

```javascript
chrome.Page.navigate({'url': 'https://github.com'}, console.log);
```

#### chrome.`<domain>`.`<event>`(callback)

Just a shorthand for:

```javascript
chrome.on('<domain>.<event>', callback);
```

For example:

```javascript
chrome.Network.requestWillBeSent(console.log);
```

#### chrome.close()

Close the connection to Chrome.

Contributors
------------

- [Andrey Sidorov](https://github.com/sidorares)
- [Greg Cochard](https://github.com/gcochard)

Resources
---------

- [Chrome Debugger Protocol Viewer][rdb-viewer]
- [Chrome Developer Tools: Remote Debugging Protocol v1.1][rdb]
- [Showcase Chrome Debugging Protocol Clients][clients]

[rdb-viewer]: http://chromedevtools.github.io/debugger-protocol-viewer/
[rdb]: https://developer.chrome.com/devtools/docs/protocol/1.1/index
[clients-cri]: https://developer.chrome.com/devtools/docs/debugging-clients#chrome-remote-interface
[clients]: https://developer.chrome.com/devtools/docs/debugging-clients

<!-- related to #10 -->
[local-json]: lib/protocol.json
[remote-json]: https://chromium.googlesource.com/chromium/blink/+/master/Source/devtools/protocol.json
[issue]: https://github.com/cyrus-and/chrome-remote-interface/issues/10
