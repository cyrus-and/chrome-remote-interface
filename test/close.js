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
    });
});
