var Chrome = require('../');
var assert = require('assert');

describe('registering event', function () {
    describe('"event"', function () {
        it('should give the raw message', function (done) {
            Chrome(function (chrome) {
                chrome.once('event', function (message) {
                    assert(message.method);
                    chrome.close(done);
                });
                chrome.send('Network.enable');
                chrome.send('Page.navigate', {'url': 'chrome://newtab/'});
            });
        });
    });
    it('should give the payload only', function (done) {
        Chrome(function (chrome) {
            chrome.once('Network.requestWillBeSent', function (message) {
                assert(!message.method);
                chrome.close(done);
            });
            chrome.send('Network.enable');
            chrome.send('Page.navigate', {'url': 'chrome://newtab/'});
        });
    });
    it('should give the payload only (alternate syntax)', function (done) {
        Chrome(function (chrome) {
            chrome.Network.requestWillBeSent(function (message) {
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
