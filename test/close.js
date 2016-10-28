'use strict';

const assert = require('assert');

const Chrome = require('../');

describe('closing a connection', function () {
    describe('with callback', function () {
        it('should allow a subsequent new connection', function (done) {
            Chrome(function (chrome) {
                chrome.close(function () {
                    Chrome(function (chrome) {
                        chrome.close(done);
                    }).on('error', function () {
                        assert(false);
                    });
                });
            }).on('error', function () {
                assert(false);
            });
        });
    });
    describe('without callback', function () {
        it('should allow a subsequent new connection', function (done) {
            Chrome(function (chrome) {
                chrome.close().then(function () {
                    Chrome(function (chrome) {
                        chrome.close(done);
                    }).on('error', function () {
                        assert(false);
                    });
                }).catch(function () {
                    assert(false);
                });
            }).on('error', function () {
                assert(false);
            });
        });
    });
});
