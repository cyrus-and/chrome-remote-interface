var Chrome = require('../');
var assert = require('assert');
var util = require('util');

describe('fetchVersion',function(){
    it('should return the version information', function (done) {
        Chrome.fetchVersion(function (err, info) {
            assert.ifError(err);
            assert(util.isObject(info));
            done();
        });
    });
});
