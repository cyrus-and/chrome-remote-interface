'use strict';

const assert = require('assert');

const Chrome = require('../');

describe('sending a command', () => {
    describe('without checking the result and without specifyng parameters', () => {
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
    describe('checking the result and without specifyng parameters', () => {
        it('should succeed', (done) => {
            Chrome((chrome) => {
                chrome.send('Page.enable', (error, response) => {
                    assert(!error);
                    chrome.close(done);
                });
            });
        });
    });
    describe('checking the result and specifyng parameters', () => {
        it('should succeed', (done) => {
            Chrome((chrome) => {
                chrome.send('Network.setCacheDisabled', {'cacheDisabled': true}, (error, response) => {
                    assert(!error);
                    chrome.close(done);
                });
            });
        });
    });
    describe('without checking the result and without specifyng parameters (shorthand)', () => {
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
    describe('checking the result and without specifyng parameters (shorthand)', () => {
        it('should succeed', (done) => {
            Chrome((chrome) => {
                chrome.Page.enable((error, response) => {
                    assert(!error);
                    chrome.close(done);
                });
            });
        });
    });
    describe('checking the result and specifyng parameters (shorthand)', () => {
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
    describe('using sendRaw', () => {
        it('should succeed', (done) => {
            Chrome((chrome) => {
                chrome.sendRaw({
                    method: 'Network.setCacheDisabled',
                    params: {'cacheDisabled': true}
                }, (error, response) => {
                    assert(!error);
                    chrome.close(done);
                });
            });
        });
    });
});
