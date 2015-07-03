var Chrome = require('../');
var assert = require('assert');
var util = require('util');

describe('Protocol', function () {
    it('should return the protocol description (possibly) from Chrome', function (done) {
        Chrome.Protocol(function (err, fromChrome, protocol) {
            assert.ifError(err);
            assert.equal(typeof protocol, 'object');
            assert.equal(typeof protocol.version, 'object');
            done();
        });
    });
    it('should return the hardcoded protocol description', function (done) {
        Chrome.Protocol({'port':1}, function (err, fromChrome, protocol) {
            assert.ifError(err);
            assert(!fromChrome);
            assert.equal(typeof protocol, 'object');
            assert.equal(typeof protocol.version, 'object');
            done();
        });
    });
});
