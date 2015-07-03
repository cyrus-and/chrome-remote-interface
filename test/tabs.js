var Chrome = require('../');
var assert = require('assert');
var util = require('util');

describe('tabs', function () {
    describe('listTabs',function(){
        it('should return the tab list', function (done) {
            Chrome.listTabs(function (err, tabs) {
                assert.ifError(err);
                assert(util.isArray(tabs));
                done();
            });
        });
    });

    describe('spawnTab',function(){
        it('should spawn a tab to a specific URL', function (done) {
            Chrome.spawnTab({url:'chrome://newtab/'}, function (err, tab) {
                assert.ifError(err);
                assert(tab.id);
                Chrome.listTabs(function (err, tabs) {
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
            Chrome.spawnTab(function (err, tab) {
                assert.ifError(err);
                assert(tab.id);
                Chrome.listTabs(function (err, tabs) {
                    assert(tabs.some(function(t){
                        return t.id === tab.id;
                    }));
                    assert(util.isArray(tabs));
                    done();
                });
            });
        });
    });

    describe('activateTab',function(){
        it('should activate an existing tab', function (done) {
            Chrome.listTabs(function (err, tabs) {
                // tabs[0] is the latest tab to be spawned
                var tab = tabs[0];
                Chrome.activateTab({id:tab.id}, function (err) {
                    assert.ifError(err);
                    done();
                });
            });
        });
    });

    describe('closeTab',function(){
        it('should close an existing tab', function (done) {
            Chrome.listTabs(function (err, tabs) {
                // tabs[0] is the latest tab to be spawned
                var tab = tabs[0];
                Chrome.closeTab({id:tab.id}, function (err) {
                    assert.ifError(err);
                    done();
                });
            });
        });
    });
});
