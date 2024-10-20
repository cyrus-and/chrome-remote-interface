'use strict';

const assert = require('assert');

const Chrome = require('../');

describe('registering event', () => {
    describe('with callback', () => {
        describe('"event"', () => {
            it('should give the raw message', (done) => {
                Chrome((chrome) => {
                    chrome.once('event', (message) => {
                        assert(message.method);
                        chrome.close(done);
                    });
                    chrome.send('Network.enable');
                    chrome.send('Page.navigate', {'url': 'chrome://newtab/'});
                });
            });
        });
        describe('sub-domain event syntax', () => {
            it('should behave as the regular syntax', (done) => {
                Chrome((chrome) => {
                    chrome.Network.on('requestWillBeSent', (message) => {
                        assert(!message.method);
                        chrome.close(done);
                    });
                    chrome.send('Network.enable');
                    chrome.send('Page.navigate', {'url': 'chrome://newtab/'});
                });
            });
        });
        it('should return an unsubscribe function', (done) => {
            Chrome((chrome) => {
                let firstTime = true;
                const unsubscribe = chrome.Network.requestWillBeSent((message) => {
                    if (!firstTime) {
                        try {
                            // just once
                            assert(false);
                        } catch (err) {
                            done(err);
                        }
                    }
                    firstTime = false;
                    unsubscribe();
                    // allows to receive and ignore other events
                    setTimeout(() => {
                        chrome.close(done);
                    }, 1000);
                });
                chrome.send('Network.enable');
                chrome.send('Page.navigate', {'url': 'http://localhost:9222'});
            });
        });
        it('should give the payload only', (done) => {
            Chrome((chrome) => {
                chrome.once('Network.requestWillBeSent', (message) => {
                    assert(!message.method);
                    chrome.close(done);
                });
                chrome.send('Network.enable');
                chrome.send('Page.navigate', {'url': 'chrome://newtab/'});
            });
        });
        it('should give the payload only (alternate syntax)', (done) => {
            Chrome((chrome) => {
                chrome.Network.requestWillBeSent((message) => {
                    assert(!message.method);
                    chrome.close(done);
                    // avoid to call `done()` more than once
                    chrome.removeAllListeners();
                });
                chrome.send('Network.enable');
                chrome.send('Page.navigate', {'url': 'chrome://newtab/'});
            });
        });
    });
    describe('without callback', () => {
        it('should give the payload only', (done) => {
            Chrome((chrome) => {
                chrome.Network.requestWillBeSent().then((message) => {
                    try {
                        assert(!message.method);
                        chrome.close(done);
                    } catch (err) {
                        done(err);
                    }
                });
                chrome.send('Network.enable');
                chrome.send('Page.navigate', {'url': 'chrome://newtab/'});
            });
        });
        it('should handle client disconnection', (done) => {
            Chrome((chrome) => {
                let error;
                chrome.Network.requestWillBeSent().catch((err) => error = err).finally(() => {
                    assert(error instanceof Error);
                    assert(error.message === 'client disconnected');
                    done();
                });
                chrome.close();
            });
        });
    });
    describe('passing a sessionId', () => {
        it('should only listen for those events', async () => {
            // fetch and connect to the browser target
            const version = await Chrome.Version();
            const chrome = await Chrome({
                target: version.webSocketDebuggerUrl
            });
            // create another target
            await chrome.Target.createTarget({url: 'about:blank'});
            // fetch the targets (two pages) and attach to each of them
            const {targetInfos} = await chrome.Target.getTargets();
            const {sessionId: sessionId0} = await chrome.Target.attachToTarget({
                targetId: targetInfos[0].targetId,
                flatten: true
            });
            const {sessionId: sessionId1} = await chrome.Target.attachToTarget({
                targetId: targetInfos[1].targetId,
                flatten: true
            });
            // enable the Page events in both of them
            await chrome.Page.enable(sessionId0);
            await chrome.Page.enable(sessionId1);
            // trigger a reload in both of them
            chrome.Page.reload(sessionId0);
            chrome.Page.reload(sessionId1);
            // awaits individual events
            await Promise.all([
                chrome.Page.loadEventFired(sessionId0),
                chrome.Page.loadEventFired(sessionId1),
                new Promise((fulfill, reject) => {
                    let counter = 0;
                    chrome.Page.loadEventFired((params) => {
                        if (++counter === 2) {
                            fulfill();
                        }
                    });
                })
            ]);
            return chrome.close();
        });
    });
});
