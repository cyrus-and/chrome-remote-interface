var Chrome = require('../');
var assert = require('assert');

describe('sending a command', function () {
    describe('without checking the result and without specifyng parameters', function () {
        it('should succeed', function (done) {
            Chrome(function (chrome) {
                chrome.once('Network.requestWillBeSent', function () {
                    chrome.close();
                    done();
                });
                chrome.send('Network.enable');
                chrome.send('Page.reload');
            });
        });
    });
    describe('checking the result and without specifyng parameters', function () {
        it('should succeed', function (done) {
            Chrome(function (chrome) {
                chrome.send('Page.enable', function (error, response) {
                    chrome.close();
                    assert(!error);
                    done();
                });
            });
        });
    });
    describe('checking the result and specifyng parameters', function () {
        it('should succeed', function (done) {
            Chrome(function (chrome) {
                chrome.send('Network.setCacheDisabled', {'cacheDisabled': true}, function (error, response) {
                    chrome.close();
                    assert(!error);
                    done();
                });
            });
        });
    });
    describe('without checking the result and without specifyng parameters (shorthand)', function () {
        it('should succeed', function (done) {
            Chrome(function (chrome) {
                chrome.once('Network.requestWillBeSent', function () {
                    chrome.close();
                    done();
                });
                chrome.Network.enable();
                chrome.Page.reload();
            });
        });
    });
    describe('checking the result and without specifyng parameters (shorthand)', function () {
        it('should succeed', function (done) {
            Chrome(function (chrome) {
                chrome.Page.enable(function (error, response) {
                    chrome.close();
                    assert(!error);
                    done();
                });
            });
        });
    });
    describe('checking the result and specifyng parameters (shorthand)', function () {
        it('should succeed', function (done) {
            Chrome(function (chrome) {
                chrome.Network.setCacheDisabled({'cacheDisabled': true}, function (error, response) {
                    chrome.close();
                    assert(!error);
                    done();
                });
            });
        });
    });
});
