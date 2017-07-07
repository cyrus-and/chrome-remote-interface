'use strict';

const assert = require('assert');

const Chrome = require('../');

describe('sending a command', function () {
    describe('without checking the result and without specifyng parameters', function () {
        it('should succeed', function (done) {
            Chrome(function (chrome) {
                chrome.once('Network.requestWillBeSent', function () {
                    chrome.close(done);
                });
                chrome.send('Network.enable');
                chrome.send('Page.navigate', {'url': 'chrome://newtab/'});
            });
        });
    });
    describe('checking the result and without specifyng parameters', function () {
        it('should succeed', function (done) {
            Chrome(function (chrome) {
                chrome.send('Page.enable', function (error, response) {
                    assert(!error);
                    chrome.close(done);
                });
            });
        });
    });
    describe('checking the result and specifyng parameters', function () {
        it('should succeed', function (done) {
            Chrome(function (chrome) {
                chrome.send('Network.setCacheDisabled', {'cacheDisabled': true}, function (error, response) {
                    assert(!error);
                    chrome.close(done);
                });
            });
        });
    });
    describe('without checking the result and without specifyng parameters (shorthand)', function () {
        it('should succeed', function (done) {
            Chrome(function (chrome) {
                chrome.once('Network.requestWillBeSent', function () {
                    chrome.close(done);
                });
                chrome.Network.enable();
                chrome.send('Page.navigate', {'url': 'chrome://newtab/'});
            });
        });
    });
    describe('checking the result and without specifyng parameters (shorthand)', function () {
        it('should succeed', function (done) {
            Chrome(function (chrome) {
                chrome.Page.enable(function (error, response) {
                    assert(!error);
                    chrome.close(done);
                });
            });
        });
    });
    describe('checking the result and specifyng parameters (shorthand)', function () {
        it('should succeed', function (done) {
            Chrome(function (chrome) {
                chrome.Network.setCacheDisabled({'cacheDisabled': true}, function (error, response) {
                    assert(!error);
                    chrome.close(done);
                });
            });
        });
    });
    describe('without a callback', function () {
        it('should fulfill the promise if the command succeeds', function (done) {
            Chrome(function (chrome) {
                chrome.send('Network.enable').then(function () {
                    chrome.close(done);
                }).catch(function () {
                    assert(false);
                });
            });
        });
        it('should reject the promise if the command fails', function (done) {
            Chrome(function (chrome) {
                chrome.send('Network.getResponseBody').then(function () {
                    done(new Error());
                }).catch(function (error) {
                    assert(error instanceof Error);
                    assert(!!error.response.code);
                    chrome.close(done);
                });
            });
        });
    });
    describe('without a callback (shorthand)', function () {
        it('should fulfill the promise if the command succeeds', function (done) {
            Chrome(function (chrome) {
                chrome.Network.enable().then(function () {
                    chrome.close(done);
                }).catch(function () {
                    assert(false);
                });
            });
        });
        it('should reject the promise if the command fails', function (done) {
            Chrome(function (chrome) {
                chrome.Network.getResponseBody().then(function () {
                    done(new Error());
                }).catch(function (error) {
                    assert(error instanceof Error);
                    assert(!!error.response.code);
                    chrome.close(done);
                });
            });
        });
    });
});
