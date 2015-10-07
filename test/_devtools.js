var Chrome = require('../');
var assert = require('assert');
var util = require('util');

describe('devtool interaction', function () {

    describe('Protocol', function () {
        it('should return the protocol descriptor (possibly) from Chrome', function (done) {
            Chrome.Protocol(function (err, fromChrome, protocol) {
                assert.ifError(err);
                assert.equal(typeof protocol, 'object');
                assert.equal(typeof protocol.version, 'object');
                done();
            });
        });
        it('should return the hardcoded protocol descriptor', function (done) {
            Chrome.Protocol({'port':1}, function (err, fromChrome, protocol) {
                assert.ifError(err);
                assert(!fromChrome);
                assert.equal(typeof protocol, 'object');
                assert.equal(typeof protocol.version, 'object');
                done();
            });
        });
    });

    describe('List',function(){
        it('should return the tab list', function (done) {
            Chrome.List(function (err, tabs) {
                assert.ifError(err);
                assert(util.isArray(tabs));
                done();
            });
        });
    });

    describe('New',function(){
        it('should spawn a tab to a specific URL', function (done) {
            Chrome.New({url:'chrome://newtab/'}, function (err, tab) {
                assert.ifError(err);
                assert(tab.id);
                Chrome.List(function (err, tabs) {
                    assert(tabs.some(function(t){
                        return t.id === tab.id;
                    }));
                    assert(util.isArray(tabs));
                    assert.equal(tab.url,'chrome://newtab/');
                    done();
                });
            });
        });
        it('should spawn a new tab', function (done) {
            Chrome.New(function (err, tab) {
                assert.ifError(err);
                assert(tab.id);
                Chrome.List(function (err, tabs) {
                    assert(tabs.some(function(t){
                        return t.id === tab.id;
                    }));
                    assert(util.isArray(tabs));
                    done();
                });
            });
        });
    });

    describe('Activate',function(){
        it('should activate an existing tab', function (done) {
            Chrome.List(function (err, tabs) {
                // tabs[0] is the latest tab to be spawned
                var tab = tabs[0];
                Chrome.Activate({id:tab.id}, function (err) {
                    assert.ifError(err);
                    done();
                });
            });
        });
    });

    describe('Close',function(){
        it('should close an existing tab', function (done) {
            Chrome.List(function (err, tabs) {
                // tabs[0] is the latest tab to be spawned
                var tab = tabs[0];
                Chrome.Close({id:tab.id}, function (err) {
                    assert.ifError(err);
                    done();
                });
            });
        });
    });

    describe('Version',function(){
        it('should return the version information', function (done) {
            Chrome.Version(function (err, info) {
                assert.ifError(err);
                assert(util.isObject(info));
                done();
            });
        });
    });

});
