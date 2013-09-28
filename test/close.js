var Chrome = require('../');
var assert = require('assert');

describe('closing a connection', function () {
    it('should allow a subsequent new connection', function (done) {
        Chrome(function (chrome) {
            chrome.close();
            Chrome(function (chrome) {
                chrome.close();
                done();
            }).on('error', function () {
                assert(false);
            });
        }).on('error', function () {
            assert(false);
        });
    });
});
