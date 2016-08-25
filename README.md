chrome-remote-interface
=======================

[Remote Debugging Protocol][rdp] interface that helps to instrument Chrome by
providing a simple abstraction of the two main objects exposed by the protocol
in a Node.js fashion: commands and notifications.

`chrome-remote-interface` is listed among
[third-party Chrome debugging protocol clients][clients-cri].

This module should work with every application implementing the Chrome [Remote
Debugging Protocol][rdp]. In particular, it has been tested against the
following implementations.

Implementation      | Notes
--------------------|------
[Google Chrome][1]  | native support
[Microsoft Edge][2] | via the [Edge Diagnostics Adapter][edge-diagnostics-adapter]
[Node.js][3.1]      | via [node-inspector][3.2] (by connecting to `ws://127.0.0.1:8080/?port=5858` by default)

[1]: https://www.chromium.org/
[2]: https://www.microsoft.com/windows/microsoft-edge
[3.1]: https://nodejs.org/
[3.2]: https://github.com/node-inspector/node-inspector

Installation
------------

    npm install chrome-remote-interface

Chrome setup
------------

Chrome needs to be started with the `--remote-debugging-port=<port>` option to
enable the [Remote Debugging Protocol][rdp], for example:

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
}).on('error', function (err) {
    console.error('Cannot connect to Chrome:', err);
});
```

REPL interface
--------------

This module comes with a REPL interface that can be used to interactively
control Chrome (run with `--help` to display the list of available options).

It supports [command execution](#chromedomainmethodparams-callback) and [event
binding](#chromedomaineventcallback). But unlike the regular API the callbacks
are overridden to conveniently display the result of the commands and the
message of the events. Also, the event binding is simplified here, executing a
shorthand method (e.g., `Page.loadEventFired()`) toggles the event
registration.

Here's a sample session:

```javascript
>>> Runtime.evaluate({expression: 'window.location.toString()'})
{ result:
   { result:
      { type: 'string',
        value: 'https://www.google.it/_/chrome/newtab?espv=2&ie=UTF-8' },
     wasThrown: false } }
>>> Page.enable()
{ result: {} }
>>> Page.loadEventFired() // registered
{ 'Page.loadEventFired': true }
>>> Page.loadEventFired() // unregistered
{ 'Page.loadEventFired': false }
>>> Page.loadEventFired() // registered
{ 'Page.loadEventFired': true }
>>> Page.navigate({url: 'https://github.com'})
{ result: { frameId: '28677.1' } }
{ 'Page.loadEventFired': { timestamp: 21385.383076 } }
>>> Runtime.evaluate({expression: 'window.location.toString()'})
{ result:
   { result: { type: 'string', value: 'https://github.com/' },
     wasThrown: false } }
```

Embedded documentation
----------------------

In both the REPL and the regular API every object of the protocol is
*decorated* with the information available through the [Remote Debugging
Protocol][rdp]. The `category` field determines if the member is a `command`,
an `event` or a `type`. Remember that this REPL interface provides completion.

For example to learn how to call `Page.navigate`:

```javascript
>>> Page.navigate
{ [Function]
  category: 'command',
  parameters: { url: { type: 'string', description: 'URL to navigate the page to.' } },
  returns:
   [ { name: 'frameId',
       '$ref': 'FrameId',
       hidden: true,
       description: 'Frame id that will be navigated.' } ],
  description: 'Navigates current page to the given URL.',
  handlers: [ 'browser', 'renderer' ] }
```

To learn about the parameters returned by the `Network.requestWillBeSent` event:

```javascript
>>> Network.requestWillBeSent
{ [Function]
  category: 'event',
  description: 'Fired when page is about to send HTTP request.',
  parameters:
   { requestId: { '$ref': 'RequestId', description: 'Request identifier.' },
     frameId:
      { '$ref': 'Page.FrameId',
        description: 'Frame identifier.',
        hidden: true },
     loaderId: { '$ref': 'LoaderId', description: 'Loader identifier.' },
     documentURL:
      { type: 'string',
        description: 'URL of the document this request is loaded for.' },
     request: { '$ref': 'Request', description: 'Request data.' },
     timestamp: { '$ref': 'Timestamp', description: 'Timestamp.' },
     wallTime:
      { '$ref': 'Timestamp',
        hidden: true,
        description: 'UTC Timestamp.' },
     initiator: { '$ref': 'Initiator', description: 'Request initiator.' },
     redirectResponse:
      { optional: true,
        '$ref': 'Response',
        description: 'Redirect response data.' },
     type:
      { '$ref': 'Page.ResourceType',
        optional: true,
        hidden: true,
        description: 'Type of this resource.' } } }
```
To inspect the `Network.Request` (note that unlike commands and events, types
are named in upper camel case) type:

```javascript
>>> Network.Request
{ category: 'type',
  id: 'Request',
  type: 'object',
  description: 'HTTP request data.',
  properties:
   { url: { type: 'string', description: 'Request URL.' },
     method: { type: 'string', description: 'HTTP request method.' },
     headers: { '$ref': 'Headers', description: 'HTTP request headers.' },
     postData:
      { type: 'string',
        optional: true,
        description: 'HTTP POST request data.' },
     mixedContentType:
      { optional: true,
        type: 'string',
        enum: [Object],
        description: 'The mixed content status of the request, as defined in http://www.w3.org/TR/mixed-content/' },
     initialPriority:
      { '$ref': 'ResourcePriority',
        description: 'Priority of the resource request at the time request is sent.' } } }
```

Remote Debugging Protocol versions
----------------------------------

Currently it is not possible to fetch the protocol descriptor
([`protocol.json`][local-json]) directly from the instrumented Chrome instance
(see [#10][issue]). Rather, that file can be fetched from the proper [source
repository][remote-json] at every connection. By default, the [local
version][local-json] is used. That file is manually updated from time to time
using `make update-protocol` and pushed to this repository.

To override the above behavior there are basically three options:

1. pass a custom protocol descriptor upon [connection](#moduleoptions-callback);

2. use the *raw* version of the [commands](#chromesendmethod-params-callback)
   and [events](#event-method) interface;

3. update the local copy with `make update-protocol` (not present when fetched
   with `npm install`).

API
---

### module([options], [callback])

Connects to a remote instance of Chrome using the [Remote Debugging
Protocol][rdp].

`options` is an object with the following optional properties:

- `host`: HTTP frontend host. Defaults to `localhost`;
- `port`: HTTP frontend port. Defaults to `9222`;
- `chooseTab`: determines which tab this instance should attach to. The behavior
  changes according to the type:

  - a `function` that takes the array returned by the `List` method and must
    return the numeric index of a tab;
  - a tab `object` like those returned by the `New` and `List` methods;
  - a `string` representing the raw WebSocket URL, in this case `host` and
    `port` are not used to fetch the tab list.

  Defaults to a function which returns the currently active tab (`function
  (tabs) { return 0; }`);
- `protocol`: [Remote Debugging Protocol][rdp] descriptor object. Defaults to
  use the protocol chosen according to the `remote` option;
- `remote`: a boolean indicating whether the protocol must be fetched
  *remotely* or if the local version must be used. It has not effect if the
  `protocol` option is set. Defaults to `false`.

`callback` is a listener automatically added to the `connect` event of the
returned `EventEmitter`; when `callback` is omitted a `Promise` object is
returned.

Returns an `EventEmitter` that supports the following events:

#### Event: 'connect'

```javascript
function (chrome) {}
```

Emitted when the connection to Chrome is established.

`chrome` is an instance of the `Chrome` class.

#### Event: 'disconnect'

```javascript
function () {}
```

Emitted when Chrome closes the connection, e.g., if the user opens the DevTools
for the currently inspected tab.

#### Event: 'error'

```javascript
function (err) {}
```

Emitted if `http://host:port/json` can't be reached or if it's not possible to
connect to Chrome's remote debugging WebSocket.

`err` is an instance of `Error`.

### module.Protocol([options], [callback])

Fetch the [Remote Debugging Protocol][rdp] descriptor.

`options` is an object with the following optional properties:

- `host`: HTTP frontend host. Defaults to `localhost`;
- `port`: HTTP frontend port. Defaults to `9222`;
- `remote`: a boolean indicating whether the protocol must be fetched
  *remotely* or if the local version must be returned. If it is not possible to
  fulfill the request then the local version is used. Defaults to `false`.

`callback` is executed when the protocol is fetched, it gets the following
arguments:

- `err`: a `Error` object indicating the success status;
- `protocol`: an object with the following properties:
   - `remote`: a boolean indicating whether the returned descriptor is the
     remote version or not (due to user choice or error);
   - `descriptor`: the [Remote Debugging Protocol][rdp] descriptor.

When `callback` is omitted a `Promise` object is returned.

For example:

```javascript
var Chrome = require('chrome-remote-interface');
Chrome.Protocol(function (err, protocol) {
    if (!err) {
        console.log(JSON.stringify(protocol.descriptor, null, 4));
    }
});
```

### module.List([options], [callback])

Request the list of the available open tabs of the remote Chrome instance.

`options` is an object with the following optional properties:

- `host`: HTTP frontend host. Defaults to `localhost`;
- `port`: HTTP frontend port. Defaults to `9222`.

`callback` is executed when the list is correctly received, it gets the
following arguments:

- `err`: a `Error` object indicating the success status;
- `tabs`: the array returned by `http://host:port/json/list` containing the tab
  list.

When `callback` is omitted a `Promise` object is returned.

For example:

```javascript
var Chrome = require('chrome-remote-interface');
Chrome.List(function (err, tabs) {
    if (!err) {
        console.log(tabs);
    }
});
```

### module.New([options], [callback])

Create a new tab in the remote Chrome instance.

`options` is an object with the following optional properties:

- `host`: HTTP frontend host. Defaults to `localhost`;
- `port`: HTTP frontend port. Defaults to `9222`.
- `url`: URL to load in the new tab. Defaults to `about:blank`.

`callback` is executed when the tab is created, it gets the
following arguments:

- `err`: a `Error` object indicating the success status;
- `tab`: the object returned by `http://host:port/json/new` containing the tab.

When `callback` is omitted a `Promise` object is returned.

For example:

```javascript
var Chrome = require('chrome-remote-interface');
Chrome.New(function (err, tab) {
    if (!err) {
        console.log(tab);
    }
});
```

### module.Activate([options], [callback])

Activate an open tab of the remote Chrome instance.

`options` is an object with the following properties:

- `host`: HTTP frontend host. Defaults to `localhost`;
- `port`: HTTP frontend port. Defaults to `9222`.
- `id`: Tab id. Required, no default.

`callback` is executed when the response to the activation request is
received. It gets the following arguments:

- `err`: a `Error` object indicating the success status;

When `callback` is omitted a `Promise` object is returned.

For example:

```javascript
var Chrome = require('chrome-remote-interface');
Chrome.Activate({'id': 'CC46FBFA-3BDA-493B-B2E4-2BE6EB0D97EC'}, function (err) {
    if (!err) {
        console.log('success! tab is closing');
    }
});
```

### module.Close([options], [callback])

Close an open tab of the remote Chrome instance.

`options` is an object with the following properties:

- `host`: HTTP frontend host. Defaults to `localhost`;
- `port`: HTTP frontend port. Defaults to `9222`.
- `id`: Tab id. Required, no default.

`callback` is executed when the response to the close request is
received. It gets the following arguments:

- `err`: a `Error` object indicating the success status;

When `callback` is omitted a `Promise` object is returned.

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

### module.Version([options], [callback])

Request version information from the remote Chrome instance.

`options` is an object with the following optional properties:

- `host`: HTTP frontend host. Defaults to `localhost`;
- `port`: HTTP frontend port. Defaults to `9222`.

`callback` is executed when the version information is correctly received, it
gets the following arguments:

- `err`: a `Error` object indicating the success status;
- `info`: a JSON object returned by `http://host:port/json/version` containing
  the version information.

When `callback` is omitted a `Promise` object is returned.

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

Refer to the [Remote Debugging Protocol specifications][rdp] for more information.

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

When `callback` is omitted a `Promise` object is returned instead, with the
fulfilled/rejected states implemented according to the `error` parameter.

Note that the field `id` mentioned in the [Remote Debugging Protocol
specifications][rdp] is managed internally and it's not exposed to the user.

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

#### chrome.close([callback])

Close the connection to Chrome.

`callback` is executed when the WebSocket is successfully closed.

When `callback` is omitted a `Promise` object is returned.

Contributors
------------

- [Andrey Sidorov](https://github.com/sidorares)
- [Greg Cochard](https://github.com/gcochard)

Resources
---------

- [Chrome Debugging Protocol][rdp]
- [Chrome Debugging Protocol Viewer][rdp-viewer]
- [Showcase Chrome Debugging Protocol Clients][clients]

[rdp]: https://developer.chrome.com/devtools/docs/debugger-protocol
[rdp-viewer]: https://chromedevtools.github.io/debugger-protocol-viewer/
[clients-cri]: https://developer.chrome.com/devtools/docs/debugging-clients#chrome-remote-interface
[clients]: https://developer.chrome.com/devtools/docs/debugging-clients
[edge-diagnostics-adapter]: https://github.com/Microsoft/edge-diagnostics-adapter

<!-- related to #10 -->
[local-json]: lib/protocol.json
[remote-json]: https://chromium.googlesource.com/chromium/src/+/master/third_party/WebKit/Source/
[issue]: https://github.com/cyrus-and/chrome-remote-interface/issues/10
