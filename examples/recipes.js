const CDP = require('..');

/*
 - log the network requests sent
 - close when the page is loaded
*/
function handleConnection(client) {
    with (client) {
        Network.requestWillBeSent(function (params) {
            console.log(params.request.url);
        });
        Page.loadEventFired(function () {
            close();
        });
        Network.enable();
        Page.enable();
        once('ready', function () {
            Page.navigate({'url': 'https://github.com'});
        });
    }
}

/*
  - startup logic
  - resume node process if it's waiting on the debugger
  - log the new scripts
*/
function handleNodeConnection(client) {
    with (client) {
        Runtime.enable();
        Debugger.enable();
        Debugger.setPauseOnExceptions({'state': 'none'});
        Debugger.setAsyncCallStackDepth({'maxDepth': 0});
        Runtime.runIfWaitingForDebugger();

        Debugger.scriptParsed(resp => console.log(resp));
    }
}

/*
  1. connect with the default host and port
  2. choose the default tab (0)
*/
function simpleConnection() {
    CDP(handleConnection).on('error', console.error);
}


/*
  Connection with a promise handler.
*/
function promiseConnection() {
    CDP().then(handleConnection).catch(console.error);
}

/*
  Connection with a couple of options
  1. set a port (same as default)
  2. override the chooseTab logic
*/
function connectionWithOptions() {
    CDP({
        port: 9222,
        chooseTab: () => 0
    })
      .then(handleConnection)
      .catch( e => console.error(e));
}

/*
  Connect to node and list parsed scripts
*/
function connectToNode() {
    CDP({port: 9229}).then(handleNodeConnection);
}

/*
  list chrome tabs
*/
function listTabs() {
    CDP.List({port: 9222}, console.log);
}

/*
  list chrome tabs with a promise handler
*/
function promiseListTabs() {
    CDP.List({port: 9229}.then(console.log(tabs)
}

// Examples

// simpleConnection();
// promiseConnection();
// connectionWithOptions();
// connectToNode();
// listTabs();
// promiseListTabs();
