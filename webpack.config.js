'use strict';

function criWrapper(_, options, callback) {
    window.criRequest(options, callback); // eslint-disable-line no-undef
}

module.exports = {
    mode: 'production',
    resolve: {
        alias: {
            'ws': './websocket-wrapper.js'
        }
    },
    externals: [
        {
            './external-request.js': `var (${criWrapper})`
        }
    ],
    entry: ['babel-polyfill', './index.js'],
    output: {
        path: __dirname,
        filename: 'chrome-remote-interface.js',
        libraryTarget: process.env.TARGET || 'commonjs2',
        library: 'CDP'
    }
};
