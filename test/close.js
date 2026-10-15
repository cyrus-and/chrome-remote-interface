'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const WebSocket = require('ws');

const Chrome = require('../');

describe('closing a connection', () => {
    it('should resolve repeated close calls in the browser bundle', async () => {
        const server = new WebSocket.Server({host: '127.0.0.1', port: 0});
        await new Promise((resolve) => server.once('listening', resolve));
        const context = {
            module: {exports: {}},
            WebSocket,
            setTimeout,
            clearTimeout,
            console
        };
        vm.runInNewContext(fs.readFileSync(require.resolve('../chrome-remote-interface.js'), 'utf8'), context);
        const browserChrome = context.module.exports.CDP;
        const chrome = await browserChrome({
            target: `ws://127.0.0.1:${server.address().port}`,
            protocol: {domains: []}
        });
        try {
            await chrome.close();
            await chrome.close();
            await new Promise((resolve) => chrome.close(resolve));
        } finally {
            await new Promise((resolve) => server.close(resolve));
        }
    });
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
