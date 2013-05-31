exports.commands = {
    'Console': [
        'clearMessages',
        'disable',
        'enable'
    ],
    'Debugger': [
        'canSetScriptSource',
        'continueToLocation',
        'disable',
        'enable',
        'evaluateOnCallFrame',
        'getScriptSource',
        'pause',
        'removeBreakpoint',
        'resume',
        'searchInContent',
        'setBreakpoint',
        'setBreakpointByUrl',
        'setBreakpointsActive',
        'setPauseOnExceptions',
        'setScriptSource',
        'stepInto',
        'stepOut',
        'stepOver'
    ],
    'DOM': [
        'getAttributes',
        'getDocument',
        'getOuterHTML',
        'hideHighlight',
        'highlightNode',
        'highlightRect',
        'moveTo',
        'querySelector',
        'querySelectorAll',
        'removeAttribute',
        'removeNode',
        'requestChildNodes',
        'requestNode',
        'resolveNode',
        'setAttributeValue',
        'setAttributesAsText',
        'setNodeName',
        'setNodeValue',
        'setOuterHTML'
    ],
    'DOMDebugger': [
        'removeDOMBreakpoint',
        'removeEventListenerBreakpoint',
        'removeXHRBreakpoint',
        'setDOMBreakpoint',
        'setEventListenerBreakpoint',
        'setXHRBreakpoint'
    ],
    'Network': [
        'canClearBrowserCache',
        'canClearBrowserCookies',
        'clearBrowserCache',
        'clearBrowserCookies',
        'disable',
        'enable',
        'getResponseBody',
        'setCacheDisabled',
        'setExtraHTTPHeaders',
        'setUserAgentOverride'
    ],
    'Page': [
        'disable',
        'enable',
        'navigate',
        'reload'
    ],
    'Runtime': [
        'callFunctionOn',
        'evaluate',
        'getProperties',
        'releaseObject',
        'releaseObjectGroup'
    ],
    'Timeline': [
        'start',
        'stop'
    ]
};
