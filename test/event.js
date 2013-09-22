var Chrome = require('../');
var assert = require('assert');

describe('registering event', function () {
    describe('"event"', function () {
        it('should give the raw message', function (done) {
            Chrome(function (chrome) {
                chrome.once('event', function (message) {
                    chrome.close();
                    assert(message.method);
                    done();
                });
                chrome.send('Network.enable');
                chrome.send('Page.reload');
            });
        });
    });
    it('should give the payload only', function (done) {
        Chrome(function (chrome) {
            chrome.once('Network.requestWillBeSent', function (message) {
                chrome.close();
                assert(!message.method);
                done();
            });
            chrome.send('Network.enable');
            chrome.send('Page.reload');
        });
    });
    it('should give the payload only (alternate syntax)', function (done) {
        Chrome(function (chrome) {
            chrome.Network.requestWillBeSent(function (message) {
                chrome.close();
                assert(!message.method);
                done();
            });
            chrome.send('Network.enable');
            chrome.send('Page.reload');
        });
    });
});
