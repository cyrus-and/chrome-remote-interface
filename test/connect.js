'use strict';

const assert = require('assert');
const url = require('url');

const Chrome = require('../');

describe('connecting to Chrome', () => {
    describe('with callback', () => {
        describe('with default parameters', () => {
            it('should succeed with "connect" callback passed as an argument', (done) => {
                Chrome((chrome) => {
                    chrome.close(done);
                }).on('error', () => {
                    assert(false);
                });
            });
        });
        describe('with custom parameters', () => {
            it('should succeed with "connect" callback passed as an argument', (done) => {
                Chrome({'host': 'localhost', 'port': 9222}, (chrome) => {
                    chrome.close(done);
                }).on('error', () => {
                    assert(false);
                });
            });
            it('should succeed with custom target by index', (done) => {
                Chrome({'target': function () { return 0; }}, (chrome) => {
                    chrome.close(done);
                }).on('error', () => {
                    assert(false);
                });
            });
            it('should succeed with custom target by object', (done) => {
                Chrome({'target': function (targets) { return targets[0]; }}, (chrome) => {
                    chrome.close(done);
                }).on('error', () => {
                    assert(false);
                });
            });
            it('should succeed with custom target by full URL', (done) => {
                Chrome.Version((err, info) => {
                    assert.ifError(err);
                    const browserUrl = info.webSocketDebuggerUrl || 'ws://localhost:9222/devtools/browser';
                    Chrome({'target': browserUrl}, (chrome) => {
                        chrome.close(done);
                    }).on('error', () => {
                        assert(false);
                    });
                });
            });
            it('should succeed with custom target by partial URL', (done) => {
                Chrome.Version((err, info) => {
                    assert.ifError(err);
                    if (info.webSocketDebuggerUrl) {
                        info.webSocketDebuggerUrl = url.parse(info.webSocketDebuggerUrl).pathname;
                    }
                    const browserUrl = info.webSocketDebuggerUrl || '/devtools/browser';
                    Chrome({'target': browserUrl}, (chrome) => {
                        chrome.close(done);
                    }).on('error', () => {
                        assert(false);
                    });
                });
            });
            it('should succeed with custom target by id', (done) => {
                Chrome.List((err, targets) => {
                    assert.ifError(err);
                    Chrome({'target': targets[0].id}, (chrome) => {
                        chrome.close(done);
                    }).on('error', () => {
                        assert(false);
                    });
                });
            });
        });
        describe('with custom (wrong) parameters', () => {
            it('should fail (wrong port)', (done) => {
                Chrome({'port': 1}, () => {
                    assert(false);
                }).on('error', (err) => {
                    assert(err instanceof Error);
                    done();
                });
            });
            it('should fail (wrong host)', (done) => {
                Chrome({'host': '255.255.255.255'}, () => {
                    assert(false);
                }).on('error', (err) => {
                    assert(err instanceof Error);
                    done();
                });
            });
            it('should fail (wrong target)', (done) => {
                Chrome({'target': function () { return -1; }}, () => {
                    assert(false);
                }).on('error', (err) => {
                    assert(err instanceof Error);
                    done();
                });
            });
        });
    });
    describe('without callback', () => {
        describe('with default parameters', () => {
            it('should succeed', (done) => {
                Chrome().then((chrome) => {
                    chrome.close(done);
                }).catch(() => {
                    assert(false);
                });
            });
        });
        describe('with custom parameters', () => {
            it('should succeed', (done) => {
                Chrome({'host': 'localhost', 'port': 9222}).then((chrome) => {
                    chrome.close(done);
                }).catch(() => {
                    assert(false);
                });
            });
            it('should succeed with custom target by index', (done) => {
                Chrome({'target': function () { return 0; }}).then((chrome) => {
                    chrome.close(done);
                }).catch(() => {
                    assert(false);
                });
            });
            it('should succeed with custom target by index', (done) => {
                Chrome({'target': function (targets) { return targets[0]; }}).then((chrome) => {
                    chrome.close(done);
                }).catch(() => {
                    assert(false);
                });
            });
            it('should succeed with custom target by full URL', (done) => {
                Chrome.Version((err, info) => {
                    assert.ifError(err);
                    const browserUrl = info.webSocketDebuggerUrl || 'ws://localhost:9222/devtools/browser';
                    Chrome({'target': browserUrl}).then((chrome) => {
                        chrome.close(done);
                    }).catch(() => {
                        assert(false);
                    });
                });
            });
            it('should succeed with custom target by partial URL', (done) => {
                Chrome.Version((err, info) => {
                    assert.ifError(err);
                    if (info.webSocketDebuggerUrl) {
                        info.webSocketDebuggerUrl = url.parse(info.webSocketDebuggerUrl).pathname;
                    }
                    const browserUrl = info.webSocketDebuggerUrl || '/devtools/browser';
                    Chrome({'target': browserUrl}).then((chrome) => {
                        chrome.close(done);
                    }).catch(() => {
                        assert(false);
                    });
                });
            });
            it('should succeed with custom target by id', (done) => {
                Chrome.List((err, targets) => {
                    assert.ifError(err);
                    Chrome({'target': targets[0].id}).then((chrome) => {
                        chrome.close(done);
                    }).catch(() => {
                        assert(false);
                    });
                });
            });
        });
        describe('with custom (wrong) parameters', () => {
            it('should fail (wrong port)', (done) => {
                Chrome({'port': 1}).then(() => {
                    done(new Error());
                }).catch((err) => {
                    assert(err instanceof Error);
                    done();
                });
            });
            it('should fail (wrong host)', (done) => {
                Chrome({'host': '255.255.255.255'}).then(() => {
                    done(new Error());
                }).catch((err) => {
                    assert(err instanceof Error);
                    done();
                });
            });
            it('should fail (wrong target)', (done) => {
                Chrome({'target': function () { return -1; }}).then(() => {
                    done(new Error());
                }).catch((err) => {
                    assert(err instanceof Error);
                    done();
                });
            });
        });
    });
});
