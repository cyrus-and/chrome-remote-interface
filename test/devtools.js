var Chrome = require('../');
var assert = require('assert');
var util = require('util');

describe('devtool interaction', function () {

    describe('Protocol', function () {
        describe('with callback', function () {
            it('should return the protocol descriptor from Chrome', function (done) {
                Chrome.Protocol(function (err, protocol) {
                    assert.ifError(err);
                    assert(!protocol.fallback);
                    assert.equal(typeof protocol.descriptor, 'object');
                    assert.equal(typeof protocol.descriptor.version, 'object');
                    done();
                });
            });
            it('should return the hardcoded protocol descriptor (on error)', function (done) {
                Chrome.Protocol({'port':1}, function (err, protocol) {
                    assert.ifError(err);
                    assert(protocol.fallback);
                    assert.equal(typeof protocol.descriptor, 'object');
                    assert.equal(typeof protocol.descriptor.version, 'object');
                    done();
                });
            });
            it('should return the hardcoded protocol descriptor (if requested)', function (done) {
                Chrome.Protocol({'fallback': true}, function (err, protocol) {
                    assert.ifError(err);
                    assert(protocol.fallback);
                    assert.equal(typeof protocol.descriptor, 'object');
                    assert.equal(typeof protocol.descriptor.version, 'object');
                    done();
                });
            });
        });
        describe('without callback', function () {
            it('should return the protocol descriptor from Chrome', function (done) {
                Chrome.Protocol().then(function (protocol) {
                    assert(!protocol.fallback);
                    assert.equal(typeof protocol.descriptor, 'object');
                    assert.equal(typeof protocol.descriptor.version, 'object');
                    done();
                }).catch(function () {
                    assert(false);
                });
            });
            it('should return the hardcoded protocol descriptor (on error)', function (done) {
                Chrome.Protocol({'port':1}).then(function (protocol) {
                    assert(protocol.fallback);
                    assert.equal(typeof protocol.descriptor, 'object');
                    assert.equal(typeof protocol.descriptor.version, 'object');
                    done();
                }).catch(function () {
                    assert(false);
                });
            });
            it('should return the hardcoded protocol descriptor (if requested)', function (done) {
                Chrome.Protocol({'fallback': true}).then(function (protocol) {
                    assert(protocol.fallback);
                    assert.equal(typeof protocol.descriptor, 'object');
                    assert.equal(typeof protocol.descriptor.version, 'object');
                    done();
                }).catch(function () {
                    assert(false);
                });
            });
        });
    });

    describe('List',function(){
        describe('with callback', function () {
            it('should return the tab list', function (done) {
                Chrome.List(function (err, tabs) {
                    assert.ifError(err);
                    assert(util.isArray(tabs));
                    done();
                });
            });
        });
        describe('without callback', function () {
            it('should return the tab list', function (done) {
                Chrome.List().then(function (tabs) {
                    assert(util.isArray(tabs));
                    done();
                }).catch(function () {
                    assert(false);
                });
            });
        });
    });

    describe('New',function(){
        describe('with callback', function () {
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
        describe('without callback', function () {
            it('should spawn a tab to a specific URL', function (done) {
                Chrome.New({url:'chrome://newtab/'}).then(function (tab) {
                    assert(tab.id);
                    Chrome.List(function (err, tabs) {
                        assert(tabs.some(function(t){
                            return t.id === tab.id;
                        }));
                        assert(util.isArray(tabs));
                        assert.equal(tab.url,'chrome://newtab/');
                        done();
                    });
                }).catch(function () {
                    assert(false);
                });
            });
            it('should spawn a new tab', function (done) {
                Chrome.New().then(function (tab) {
                    assert(tab.id);
                    Chrome.List(function (err, tabs) {
                        assert(tabs.some(function(t){
                            return t.id === tab.id;
                        }));
                        assert(util.isArray(tabs));
                        done();
                    });
                }).catch(function (err) {
                    assert(false);
                });
            });
        });
    });

    describe('Activate',function(){
        describe('with callback',function(){
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
        describe('without callback',function(){
            it('should activate an existing tab', function (done) {
                Chrome.List(function (err, tabs) {
                    // tabs[0] is the latest tab to be spawned
                    var tab = tabs[0];
                    Chrome.Activate({id:tab.id}).then(function () {
                        done();
                    }).catch(function () {
                        assert(false);
                    });
                });
            });
        });
    });

    describe('Close',function(){
        describe('with callback',function(){
            it('should close an existing tab', function (done) {
                Chrome.List(function (err, tabs) {
                    // tabs[0] is the latest tab to be spawned
                    var tab = tabs[0];
                    Chrome.Close({id:tab.id}, function (err) {
                        assert.ifError(err);
                        // avoid that further test cases attach to this tab as the
                        // actual close is a bit delayed
                        setTimeout(done, 1000);
                    });
                });
            });
        });
        describe('without callback',function(){
            it('should close an existing tab', function (done) {
                Chrome.List(function (err, tabs) {
                    // tabs[0] is the latest tab to be spawned
                    var tab = tabs[0];
                    Chrome.Close({id:tab.id}).then(function () {
                        // avoid that further test cases attach to this tab as the
                        // actual close is a bit delayed
                        setTimeout(done, 1000);
                    }).catch(function () {
                        assert(false);
                    });
                });
            });
        });
    });

    describe('Version',function(){
        describe('with callback',function(){
            it('should return the version information', function (done) {
                Chrome.Version(function (err, info) {
                    assert.ifError(err);
                    assert(util.isObject(info));
                    done();
                });
            });
        });
        describe('without callback',function(){
            it('should return the version information', function (done) {
                Chrome.Version().then(function (info) {
                    assert(util.isObject(info));
                    done();
                }).catch(function () {
                    assert(false);
                });
            });
        });
    });

});
