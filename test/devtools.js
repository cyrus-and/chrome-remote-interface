'use strict';

const assert = require('assert');
const util = require('util');

const Chrome = require('../');

describe('devtool interaction', () => {
    describe('Protocol', () => {
        describe('with callback', () => {
            it('should return the local protocol descriptor', (done) => {
                Chrome.Protocol({'local': true, 'port': 1}, (err, protocol) => {
                    assert.ifError(err);
                    assert.equal(typeof protocol, 'object');
                    assert.equal(typeof protocol.version, 'object');
                    done();
                });
            });
            it('should return the remote protocol descriptor', (done) => {
                Chrome.Protocol((err, protocol) => {
                    assert.ifError(err);
                    assert.equal(typeof protocol, 'object');
                    assert.equal(typeof protocol.version, 'object');
                    done();
                });
            });
            it('should fail if remote is not available', (done) => {
                Chrome.Protocol({'port': 1}, (err, protocol) => {
                    assert(err !== null);
                    assert(!protocol);
                    done();
                });
            });
        });
        describe('without callback', () => {
            it('should return the local protocol descriptor', (done) => {
                Chrome.Protocol({'local': true, 'port': 1}).then((protocol) => {
                    try {
                        assert.equal(typeof protocol, 'object');
                        assert.equal(typeof protocol.version, 'object');
                        done();
                    } catch (err) {
                        done(err);
                    }
                }).catch(() => {
                    assert(false);
                });
            });
            it('should return the remote protocol descriptor', (done) => {
                Chrome.Protocol().then((protocol) => {
                    try {
                        assert.equal(typeof protocol, 'object');
                        assert.equal(typeof protocol.version, 'object');
                        done();
                    } catch (err) {
                        done(err);
                    }
                }).catch(() => {
                    assert(false);
                });
            });
            it('should fail if remote is not available', (done) => {
                Chrome.Protocol({'port': 1}).then((protocol) => {
                    done(new Error());
                }).catch(() => {
                    done();
                });
            });
        });
    });
    describe('List', () => {
        describe('with callback', () => {
            it('should return the target list', (done) => {
                Chrome.List((err, targets) => {
                    assert.ifError(err);
                    assert(util.isArray(targets));
                    done();
                });
            });
        });
        describe('without callback', () => {
            it('should return the target list', (done) => {
                Chrome.List().then((targets) => {
                    try {
                        assert(util.isArray(targets));
                        done();
                    } catch (err) {
                        done(err);
                    }
                }).catch(() => {
                    assert(false);
                });
            });
        });
    });
    describe('New', () => {
        describe('with callback', () => {
            it('should spawn a target to a specific URL', (done) => {
                Chrome.New({url: 'chrome://newtab/'}, (err, target) => {
                    assert.ifError(err);
                    assert(target.id);
                    Chrome.List((err, targets) => {
                        assert(targets.some((t) => {
                            return t.id === target.id;
                        }));
                        assert(util.isArray(targets));
                        assert.equal(target.url, 'chrome://newtab/');
                        done();
                    });
                });
            });
            it('should spawn a new target', (done) => {
                Chrome.New((err, target) => {
                    assert.ifError(err);
                    assert(target.id);
                    Chrome.List((err, targets) => {
                        assert(targets.some((t) => {
                            return t.id === target.id;
                        }));
                        assert(util.isArray(targets));
                        done();
                    });
                });
            });
        });
        describe('without callback', () => {
            it('should spawn a target to a specific URL', (done) => {
                Chrome.New({url: 'chrome://newtab/'}).then((target) => {
                    try {
                        assert(target.id);
                        Chrome.List((err, targets) => {
                            assert(targets.some((t) => {
                                return t.id === target.id;
                            }));
                            assert(util.isArray(targets));
                            assert.equal(target.url, 'chrome://newtab/');
                            done();
                        });
                    } catch (err) {
                        done(err);
                    }
                }).catch(() => {
                    assert(false);
                });
            });
            it('should spawn a new target', (done) => {
                Chrome.New().then((target) => {
                    try {
                        assert(target.id);
                        Chrome.List((err, targets) => {
                            assert(targets.some((t) => {
                                return t.id === target.id;
                            }));
                            assert(util.isArray(targets));
                            done();
                        });
                    } catch (err) {
                        done(err);
                    }
                }).catch((err) => {
                    assert(false);
                });
            });
        });
    });
    describe('Activate', () => {
        describe('with callback', () => {
            it('should activate an existing target', (done) => {
                Chrome.List((err, targets) => {
                    // targets[0] is the latest target to be spawned
                    const target = targets[0];
                    Chrome.Activate({id: target.id}, (err) => {
                        assert.ifError(err);
                        done();
                    });
                });
            });
        });
        describe('without callback', () => {
            it('should activate an existing target', (done) => {
                Chrome.List((err, targets) => {
                    // targets[0] is the latest target to be spawned
                    const target = targets[0];
                    Chrome.Activate({id: target.id}).then(() => {
                        done();
                    }).catch(() => {
                        assert(false);
                    });
                });
            });
        });
    });
    describe('Close', () => {
        describe('with callback', () => {
            it('should close an existing target', (done) => {
                Chrome.List((err, targets) => {
                    // targets[0] is the latest target to be spawned
                    const target = targets[0];
                    Chrome.Close({id: target.id}, (err) => {
                        assert.ifError(err);
                        // avoid that further test cases attach to this target as the
                        // actual close is a bit delayed
                        setTimeout(done, 1000);
                    });
                });
            });
        });
        describe('without callback', () => {
            it('should close an existing target', (done) => {
                Chrome.List((err, targets) => {
                    // targets[0] is the latest target to be spawned
                    const target = targets[0];
                    Chrome.Close({id: target.id}).then(() => {
                        // avoid that further test cases attach to this target as the
                        // actual close is a bit delayed
                        setTimeout(done, 1000);
                    }).catch(() => {
                        assert(false);
                    });
                });
            });
        });
    });
    describe('Version', () => {
        describe('with callback', () => {
            it('should return the version information', (done) => {
                Chrome.Version((err, info) => {
                    assert.ifError(err);
                    assert(util.isObject(info));
                    done();
                });
            });
        });
        describe('without callback', () => {
            it('should return the version information', (done) => {
                Chrome.Version().then((info) => {
                    try {
                        assert(util.isObject(info));
                        done();
                    } catch (err) {
                        done(err);
                    }
                }).catch(() => {
                    assert(false);
                });
            });
        });
    });
});
