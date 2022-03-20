'use strict';

const assert = require('assert');

const Chrome = require('../');

describe('sending a command', () => {
    describe('without checking the result and without specifying parameters', () => {
        it('should succeed', (done) => {
            Chrome((chrome) => {
                chrome.once('Network.requestWillBeSent', () => {
                    chrome.close(done);
                });
                chrome.send('Network.enable');
                chrome.send('Page.navigate', {'url': 'chrome://newtab/'});
            });
        });
    });
    describe('checking the result and without specifying parameters', () => {
        it('should succeed', (done) => {
            Chrome((chrome) => {
                chrome.send('Page.enable', (error, response) => {
                    assert(!error);
                    chrome.close(done);
                });
            });
        });
    });
    describe('checking the result and specifying parameters', () => {
        it('should succeed', (done) => {
            Chrome((chrome) => {
                chrome.send('Network.setCacheDisabled', {'cacheDisabled': true}, (error, response) => {
                    assert(!error);
                    chrome.close(done);
                });
            });
        });
    });
    describe('without checking the result and without specifying parameters (shorthand)', () => {
        it('should succeed', (done) => {
            Chrome((chrome) => {
                chrome.once('Network.requestWillBeSent', () => {
                    chrome.close(done);
                });
                chrome.Network.enable();
                chrome.send('Page.navigate', {'url': 'chrome://newtab/'});
            });
        });
    });
    describe('checking the result and without specifying parameters (shorthand)', () => {
        it('should succeed', (done) => {
            Chrome((chrome) => {
                chrome.Page.enable((error, response) => {
                    assert(!error);
                    chrome.close(done);
                });
            });
        });
    });
    describe('checking the result and specifying parameters (shorthand)', () => {
        it('should succeed', (done) => {
            Chrome((chrome) => {
                chrome.Network.setCacheDisabled({'cacheDisabled': true}, (error, response) => {
                    assert(!error);
                    chrome.close(done);
                });
            });
        });
    });
    it('should catch WebSocket errors', (done) => {
        Chrome((chrome) => {
            // simulate unhandled disconnection
            chrome.close(() => {
                chrome.Page.enable((error, response) => {
                    assert(error instanceof Error);
                    assert(!response);
                    done();
                });
            });
        });
    });
    describe('without a callback', () => {
        it('should fulfill the promise if the command succeeds', (done) => {
            Chrome((chrome) => {
                chrome.send('Network.enable').then(() => {
                    chrome.close(done);
                }).catch(() => {
                    assert(false);
                });
            });
        });
        it('should reject the promise if the command fails', (done) => {
            Chrome((chrome) => {
                chrome.send('Network.getResponseBody').then(() => {
                    done(new Error());
                }).catch((error) => {
                    assert(error instanceof Error);
                    assert(!!error.request);
                    assert(!!error.response.code);
                    chrome.close(done);
                });
            });
        });
        it('should catch WebSocket errors', (done) => {
            Chrome((chrome) => {
                // simulate unhandled disconnection
                chrome.close(() => {
                    chrome.Page.enable().then((response) => {
                        assert(!false);
                    }).catch((err) => {
                        assert(err instanceof Error);
                        assert(!err.request); // not protocol error
                        assert(!err.response); // not protocol error
                        done();
                    });
                });
            });
        });
    });
    describe('without a callback (shorthand)', () => {
        it('should fulfill the promise if the command succeeds', (done) => {
            Chrome((chrome) => {
                chrome.Network.enable().then(() => {
                    chrome.close(done);
                }).catch(() => {
                    assert(false);
                });
            });
        });
        it('should reject the promise if the command fails', (done) => {
            Chrome((chrome) => {
                chrome.Network.getResponseBody().then(() => {
                    done(new Error());
                }).catch((error) => {
                    assert(error instanceof Error);
                    assert(!!error.request);
                    assert(!!error.response.code);
                    chrome.close(done);
                });
            });
        });
    });
    describe('passing a sessionId', () => {
        it('should interact with the correct target', async () => {
            // fetch and connect to the browser target
            const version = await Chrome.Version();
            const chrome = await Chrome({
                target: version.webSocketDebuggerUrl
            });
            // attach to the target
            const {targetInfos} = await chrome.Target.getTargets();
            const {sessionId} = await chrome.Target.attachToTarget({
                targetId: targetInfos[0].targetId,
                flatten: true
            });
            // send a command using the sessionId
            const info = await chrome.Target.getTargetInfo(sessionId);
            assert(info);
            assert(info.targetInfo);
            assert.equal(info.targetInfo.type, 'page');
            assert.equal(info.targetInfo.attached, true);
            return chrome.close();
        });
    });
});
