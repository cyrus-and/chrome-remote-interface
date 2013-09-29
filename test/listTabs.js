var Chrome = require('../');
var assert = require('assert');
var util = require('util');

describe('listTabs', function () {
    it('should return the tab list', function (done) {
        Chrome.listTabs(function (err, tabs) {
            assert.ifError(err);
            assert(util.isArray(tabs));
            done();
        });
    });
});
