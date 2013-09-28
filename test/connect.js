var Chrome = require('../');
var assert = require('assert');

describe('connecting to Chrome', function () {
    describe('with default parameters', function () {
        it('should succeed with "connect" callback passed as an argument', function (done) {
            Chrome(function (chrome) {
                chrome.close();
                done();
            }).on('error', function () {
                assert(false);
            });
        });
        it('should succeed with "connect" callback registered later', function (done) {
            Chrome().on('connect', function (chrome) {
                chrome.close();
                done();
            }).on('error', function () {
                assert(false);
            });
        });
    });
    describe('with custom parameters', function () {
        it('should succeed with "connect" callback passed as an argument', function (done) {
            Chrome({'host': 'localhost', 'port': 9222}, function (chrome) {
                chrome.close();
                done();
            }).on('error', function () {
                assert(false);
            });
        });
        it('should succeed with "connect" callback registered later', function (done) {
            Chrome({'host': 'localhost', 'port': 9222}).on('connect', function (chrome) {
                chrome.close();
                done();
            }).on('error', function () {
                assert(false);
            });
        });
    });
    describe('with custom (wrong) parameters', function () {
        it('should fail (wrong port)', function (done) {
            Chrome({'port': 1}, function () {
                assert(false);
            }).on('error', function (err) {
                assert(err instanceof Error);
                done();
            });
        });
        it('should fail (wrong host)', function (done) {
            Chrome({'host': '255.255.255.255'}, function () {
                assert(false);
            }).on('error', function (err) {
                assert(err instanceof Error);
                done();
            });
        });
        it('should fail (wrong tab)', function (done) {
            Chrome({'chooseTab': function () { return -1; }}, function () {
                assert(false);
            }).on('error', function (err) {
                assert(err instanceof Error);
                done();
            });
        });
    });
    describe('two times', function () {
        it('should fail', function (done) {
            Chrome(function (chrome) {
                Chrome(function () {
                    assert(false);
                }).on('error', function (err) {
                    chrome.close();
                    assert(err instanceof Error);
                    done();
                });
            }).on('error', function () {
                assert(false);
            });
        });
    });
});
