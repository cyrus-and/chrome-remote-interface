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
    });
});
