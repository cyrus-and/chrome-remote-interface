'use strict';

const assert = require('assert');
const url = require('url');

const Chrome = require('../');

describe('connecting to Chrome', function () {
    describe('with callback', function () {
        describe('with default parameters', function () {
            it('should succeed with "connect" callback passed as an argument', function (done) {
                Chrome(function (chrome) {
                    chrome.close(done);
                }).on('error', function () {
                    assert(false);
                });
            });
        });
        describe('with custom parameters', function () {
            it('should succeed with "connect" callback passed as an argument', function (done) {
                Chrome({'host': 'localhost', 'port': 9222}, function (chrome) {
                    chrome.close(done);
                }).on('error', function () {
                    assert(false);
                });
            });
            it('should succeed with custom target by index', function (done) {
                Chrome({'target': function () { return 0; }}, function (chrome) {
                    chrome.close(done);
                }).on('error', function () {
                    assert(false);
                });
            });
            it('should succeed with custom target by object', function (done) {
                Chrome({'target': function (targets) { return targets[0]; }}, function (chrome) {
                    chrome.close(done);
                }).on('error', function () {
                    assert(false);
                });
            });
            it('should succeed with custom target by full URL', function (done) {
                Chrome.Version(function (err, info) {
                    assert.ifError(err);
                    const browserUrl = info.webSocketDebuggerUrl || 'ws://localhost:9222/devtools/browser';
                    Chrome({'target': browserUrl}, function (chrome) {
                        chrome.close(done);
                    }).on('error', function () {
                        assert(false);
                    });
                });
            });
            it('should succeed with custom target by partial URL', function (done) {
                Chrome.Version(function (err, info) {
                    assert.ifError(err);
                    if (info.webSocketDebuggerUrl) {
                        info.webSocketDebuggerUrl = url.parse(info.webSocketDebuggerUrl).pathname;
                    }
                    const browserUrl = info.webSocketDebuggerUrl || '/devtools/browser';
                    Chrome({'target': browserUrl}, function (chrome) {
                        chrome.close(done);
                    }).on('error', function () {
                        assert(false);
                    });
                });
            });
            it('should succeed with custom target by id', function (done) {
                Chrome.List(function (err, targets) {
                    assert.ifError(err);
                    Chrome({'target': targets[0].id}, function (chrome) {
                        chrome.close(done);
                    }).on('error', function () {
                        assert(false);
                    });
                });
            });
        });
        describe('with custom (wrong) parameters', function () {
            it('should fail (wrong port)', function (done) {
                Chrome({'port': 1}, function () {
                    assert(false);
                }).on('error', function (err) {
                    assert(err instanceof Error);
                    done();
                });
            });
            it('should fail (wrong host)', function (done) {
                Chrome({'host': '255.255.255.255'}, function () {
                    assert(false);
                }).on('error', function (err) {
                    assert(err instanceof Error);
                    done();
                });
            });
            it('should fail (wrong target)', function (done) {
                Chrome({'target': function () { return -1; }}, function () {
                    assert(false);
                }).on('error', function (err) {
                    assert(err instanceof Error);
                    done();
                });
            });
        });
        describe('two times', function () {
            it('should fail', function (done) {
                const options = {
                    target: () => 0
                };
                Chrome(options, function (chrome) {
                    Chrome(options, function () {
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
                Chrome().then(function (chrome) {
                    chrome.close(done);
                }).catch(function () {
                    assert(false);
                });
            });
        });
        describe('with custom parameters', function () {
            it('should succeed', function (done) {
                Chrome({'host': 'localhost', 'port': 9222}).then(function (chrome) {
                    chrome.close(done);
                }).catch(function () {
                    assert(false);
                });
            });
            it('should succeed with custom target by index', function (done) {
                Chrome({'target': function () { return 0; }}).then(function (chrome) {
                    chrome.close(done);
                }).catch(function () {
                    assert(false);
                });
            });
            it('should succeed with custom target by index', function (done) {
                Chrome({'target': function (targets) { return targets[0]; }}).then(function (chrome) {
                    chrome.close(done);
                }).catch(function () {
                    assert(false);
                });
            });
            it('should succeed with custom target by full URL', function (done) {
                Chrome.Version(function (err, info) {
                    assert.ifError(err);
                    const browserUrl = info.webSocketDebuggerUrl || 'ws://localhost:9222/devtools/browser';
                    Chrome({'target': browserUrl}).then(function (chrome) {
                        chrome.close(done);
                    }).catch(function () {
                        assert(false);
                    });
                });
            });
            it('should succeed with custom target by partial URL', function (done) {
                Chrome.Version(function (err, info) {
                    assert.ifError(err);
                    if (info.webSocketDebuggerUrl) {
                        info.webSocketDebuggerUrl = url.parse(info.webSocketDebuggerUrl).pathname;
                    }
                    const browserUrl = info.webSocketDebuggerUrl || '/devtools/browser';
                    Chrome({'target': browserUrl}).then(function (chrome) {
                        chrome.close(done);
                    }).catch(function () {
                        assert(false);
                    });
                });
            });
            it('should succeed with custom target by id', function (done) {
                Chrome.List(function (err, targets) {
                    assert.ifError(err);
                    Chrome({'target': targets[0].id}).then(function (chrome) {
                        chrome.close(done);
                    }).catch(function () {
                        assert(false);
                    });
                });
            });
        });
        describe('with custom (wrong) parameters', function () {
            it('should fail (wrong port)', function (done) {
                Chrome({'port': 1}).then(function () {
                    done(new Error());
                }).catch(function (err) {
                    assert(err instanceof Error);
                    done();
                });
            });
            it('should fail (wrong host)', function (done) {
                Chrome({'host': '255.255.255.255'}).then(function () {
                    done(new Error());
                }).catch(function (err) {
                    assert(err instanceof Error);
                    done();
                });
            });
            it('should fail (wrong target)', function (done) {
                Chrome({'target': function () { return -1; }}).then(function () {
                    done(new Error());
                }).catch(function (err) {
                    assert(err instanceof Error);
                    done();
                });
            });
        });
        describe('two times', function () {
            it('should fail', function (done) {
                const options = {
                    target: () => 0
                };
                Chrome(options, function (chrome) {
                    Chrome(options).then(function () {
                        done(new Error());
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
