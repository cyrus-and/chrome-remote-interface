'use strict';

const assert = require('assert');

const Chrome = require('../');

describe('connecting to Chrome', function () {
    describe('with callback', function () {
        describe('with default parameters', function () {
            it('should succeed with "connect" callback passed as an argument', function (done) {
                Chrome.connect(function (chrome) {
                    chrome.close(done);
                }).on('error', function () {
                    assert(false);
                });
            });
        });
        describe('with custom parameters', function () {
            it('should succeed with "connect" callback passed as an argument', function (done) {
                Chrome.connect({'host': 'localhost', 'port': 9222}, function (chrome) {
                    chrome.close(done);
                }).on('error', function () {
                    assert(false);
                });
            });
        });
        describe('with custom (wrong) parameters', function () {
            it('should fail (wrong port)', function (done) {
                Chrome.connect({'port': 1}, function () {
                    assert(false);
                }).on('error', function (err) {
                    assert(err instanceof Error);
                    done();
                });
            });
            it('should fail (wrong host)', function (done) {
                Chrome.connect({'host': '255.255.255.255'}, function () {
                    assert(false);
                }).on('error', function (err) {
                    assert(err instanceof Error);
                    done();
                });
            });
            it('should fail (wrong tab)', function (done) {
                Chrome.connect({'chooseTab': function () { return -1; }}, function () {
                    assert(false);
                }).on('error', function (err) {
                    assert(err instanceof Error);
                    done();
                });
            });
        });
        describe('two times', function () {
            it('should fail', function (done) {
                Chrome.connect(function (chrome) {
                    Chrome.connect(function () {
                        assert(false);
                    }).on('error', function (err) {
                        assert(err instanceof Error);
                        chrome.close(done);
                    });
                }).on('error', function () {
                    assert(false);
                });
            });
        });
    });
    describe('without callback', function () {
        describe('with default parameters', function () {
            it('should succeed', function (done) {
                Chrome.connect().then(function (chrome) {
                    chrome.close(done);
                }).catch(function () {
                    assert(false);
                });
            });
        });
        describe('with custom parameters', function () {
            it('should succeed', function (done) {
                Chrome.connect({'host': 'localhost', 'port': 9222}).then(function (chrome) {
                    chrome.close(done);
                }).catch(function () {
                    assert(false);
                });
            });
        });
        describe('with custom (wrong) parameters', function () {
            it('should fail (wrong port)', function (done) {
                Chrome.connect({'port': 1}).then(function () {
                    assert(false);
                }).catch(function (err) {
                    assert(err instanceof Error);
                    done();
                });
            });
            it('should fail (wrong host)', function (done) {
                Chrome.connect({'host': '255.255.255.255'}).then(function () {
                    assert(false);
                }).catch(function (err) {
                    assert(err instanceof Error);
                    done();
                });
            });
            it('should fail (wrong tab)', function (done) {
                Chrome.connect({'chooseTab': function () { return -1; }}).then(function () {
                    assert(false);
                }).catch(function (err) {
                    assert(err instanceof Error);
                    done();
                });
            });
        });
        describe('two times', function () {
            it('should fail', function (done) {
                Chrome.connect(function (chrome) {
                    Chrome.connect().then(function () {
                        assert(false);
                    }).catch(function (err) {
                        assert(err instanceof Error);
                        chrome.close(done);
                    });
                }).on('error', function () {
                    assert(false);
                });
            });
        });
    });
});
