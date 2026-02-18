'use strict';

const assert = require('assert');

const Chrome = require('../');

describe('closing a connection', () => {
    describe('with callback', () => {
        it('should allow a subsequent new connection', (done) => {
            Chrome((chrome) => {
                chrome.close(() => {
                    Chrome((chrome) => {
                        chrome.close(done);
                    }).on('error', () => {
                        assert(false);
                    });
                });
            }).on('error', () => {
                assert(false);
            });
        });
        it('should handle multiple close calls', (done) => {
            Chrome((chrome) => {
                let counter = 0;
                chrome.close(() => ++counter);
                chrome.close(() => {
                    chrome.close(() => {
                        assert(++counter === 2);
                        done();
                    });
                });
            }).on('error', () => {
                assert(false);
            });
        });
    });
    describe('without callback', () => {
        it('should allow a subsequent new connection', (done) => {
            Chrome((chrome) => {
                chrome.close().then(() => {
                    Chrome((chrome) => {
                        chrome.close(done);
                    }).on('error', () => {
                        assert(false);
                    });
                }).catch(() => {
                    assert(false);
                });
            }).on('error', () => {
                assert(false);
            });
        });
        it('should handle multiple close calls', async () => {
            const chrome = await Chrome();
            await Promise.all([chrome.close(), chrome.close()]); // concurrent
            await chrome.close(); // already closed
        });
    });
});
