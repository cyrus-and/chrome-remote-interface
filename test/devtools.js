'use strict';

const assert = require('assert');
const util = require('util');

const Chrome = require('../');

describe('devtool interaction', function () {
    describe('Protocol', function () {
        describe('with callback', function () {
            it('should return the local protocol descriptor', function (done) {
                Chrome.Protocol(function (err, protocol) {
                    assert.ifError(err);
                    assert(!protocol.remote);
                    assert.equal(typeof protocol.descriptor, 'object');
                    assert.equal(typeof protocol.descriptor.version, 'object');
                    done();
                });
            });
            it('should fail if remote is not available', function (done) {
                Chrome.Protocol({'remote': true, 'port': 1}, function (err, protocol) {
                    assert(err !== null);
                    assert(!protocol);
                    done();
                });
            });
            it('should return the remote protocol descriptor', function (done) {
                Chrome.Protocol({'remote': true}, function (err, protocol) {
                    assert.ifError(err);
                    assert(protocol.remote);
                    assert.equal(typeof protocol.descriptor, 'object');
                    assert.equal(typeof protocol.descriptor.version, 'object');
                    done();
                });
            });
        });
        describe('without callback', function () {
            it('should return the local protocol descriptor', function (done) {
                Chrome.Protocol().then(function (protocol) {
                    try {
                        assert(!protocol.remote);
                        assert.equal(typeof protocol.descriptor, 'object');
                        assert.equal(typeof protocol.descriptor.version, 'object');
                        done();
                    } catch (err) {
                        done(err);
                    }
                }).catch(function () {
                    assert(false);
                });
            });
            it('should fail if remote is not available', function (done) {
                Chrome.Protocol({'remote': true, 'port': 1}).then(function (protocol) {
                    done(new Error());
                }).catch(function () {
                    done();
                });
            });
            it('should return the remote protocol descriptor', function (done) {
                Chrome.Protocol({'remote': true}).then(function (protocol) {
                    try {
                        assert(protocol.remote);
                        assert.equal(typeof protocol.descriptor, 'object');
                        assert.equal(typeof protocol.descriptor.version, 'object');
                        done();
                    } catch (err) {
                        done(err);
                    }
                }).catch(function () {
                    assert(false);
                });
            });
        });
    });
    describe('List', function () {
        describe('with callback', function () {
            it('should return the target list', function (done) {
                Chrome.List(function (err, targets) {
                    assert.ifError(err);
                    assert(util.isArray(targets));
                    done();
                });
            });
        });
        describe('without callback', function () {
            it('should return the target list', function (done) {
                Chrome.List().then(function (targets) {
                    try {
                        assert(util.isArray(targets));
                        done();
                    } catch (err) {
                        done(err);
                    }
                }).catch(function () {
                    assert(false);
                });
            });
        });
    });
    describe('New', function () {
        describe('with callback', function () {
            it('should spawn a target to a specific URL', function (done) {
                Chrome.New({url: 'chrome://newtab/'}, function (err, target) {
                    assert.ifError(err);
                    assert(target.id);
                    Chrome.List(function (err, targets) {
                        assert(targets.some(function (t) {
                            return t.id === target.id;
                        }));
                        assert(util.isArray(targets));
                        assert.equal(target.url, 'chrome://newtab/');
                        done();
                    });
                });
            });
            it('should spawn a new target', function (done) {
                Chrome.New(function (err, target) {
                    assert.ifError(err);
                    assert(target.id);
                    Chrome.List(function (err, targets) {
                        assert(targets.some(function (t) {
                            return t.id === target.id;
                        }));
                        assert(util.isArray(targets));
                        done();
                    });
                });
            });
        });
        describe('without callback', function () {
            it('should spawn a target to a specific URL', function (done) {
                Chrome.New({url: 'chrome://newtab/'}).then(function (target) {
                    try {
                        assert(target.id);
                        Chrome.List(function (err, targets) {
                            assert(targets.some(function (t) {
                                return t.id === target.id;
                            }));
                            assert(util.isArray(targets));
                            assert.equal(target.url, 'chrome://newtab/');
                            done();
                        });
                    } catch (err) {
                        done(err);
                    }
                }).catch(function () {
                    assert(false);
                });
            });
            it('should spawn a new target', function (done) {
                Chrome.New().then(function (target) {
                    try {
                        assert(target.id);
                        Chrome.List(function (err, targets) {
                            assert(targets.some(function (t) {
                                return t.id === target.id;
                            }));
                            assert(util.isArray(targets));
                            done();
                        });
                    } catch (err) {
                        done(err);
                    }
                }).catch(function (err) {
                    assert(false);
                });
            });
        });
    });
    describe('Activate', function () {
        describe('with callback', function () {
            it('should activate an existing target', function (done) {
                Chrome.List(function (err, targets) {
                    // targets[0] is the latest target to be spawned
                    const target = targets[0];
                    Chrome.Activate({id: target.id}, function (err) {
                        assert.ifError(err);
                        done();
                    });
                });
            });
        });
        describe('without callback', function () {
            it('should activate an existing target', function (done) {
                Chrome.List(function (err, targets) {
                    // targets[0] is the latest target to be spawned
                    const target = targets[0];
                    Chrome.Activate({id: target.id}).then(function () {
                        done();
                    }).catch(function () {
                        assert(false);
                    });
                });
            });
        });
    });
    describe('Close', function () {
        describe('with callback', function () {
            it('should close an existing target', function (done) {
                Chrome.List(function (err, targets) {
                    // targets[0] is the latest target to be spawned
                    const target = targets[0];
                    Chrome.Close({id: target.id}, function (err) {
                        assert.ifError(err);
                        // avoid that further test cases attach to this target as the
                        // actual close is a bit delayed
                        setTimeout(done, 1000);
                    });
                });
            });
        });
        describe('without callback', function () {
            it('should close an existing target', function (done) {
                Chrome.List(function (err, targets) {
                    // targets[0] is the latest target to be spawned
                    const target = targets[0];
                    Chrome.Close({id: target.id}).then(function () {
                        // avoid that further test cases attach to this target as the
                        // actual close is a bit delayed
                        setTimeout(done, 1000);
                    }).catch(function () {
                        assert(false);
                    });
                });
            });
        });
    });
    describe('Version', function () {
        describe('with callback', function () {
            it('should return the version information', function (done) {
                Chrome.Version(function (err, info) {
                    assert.ifError(err);
                    assert(util.isObject(info));
                    done();
                });
            });
        });
        describe('without callback', function () {
            it('should return the version information', function (done) {
                Chrome.Version().then(function (info) {
                    try {
                        assert(util.isObject(info));
                        done();
                    } catch (err) {
                        done(err);
                    }
                }).catch(function () {
                    assert(false);
                });
            });
        });
    });
});
