var Chrome = require('../');
var assert = require('assert');
var util = require('util');

describe('Version',function(){
    it('should return the version information', function (done) {
        Chrome.Version(function (err, info) {
            assert.ifError(err);
            assert(util.isObject(info));
            done();
        });
    });
});
