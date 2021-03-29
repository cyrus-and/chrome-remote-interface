'use strict';

const webpack = require('webpack');

function criWrapper(_, options, callback) {
    window.criRequest(options, callback); // eslint-disable-line no-undef
}

module.exports = {
    mode: 'production',
    resolve: {
        alias: {
            'ws': './websocket-wrapper.js'
        },
        fallback: {
            'buffer': require.resolve('buffer/'),
            'util': require.resolve('util/'),
            'url': require.resolve('url/'),
            'http': require.resolve('stream-http'),
            'https': require.resolve('https-browserify')
        }
    },
    externals: [
        {
            './external-request.js': `var (${criWrapper})`
        }
    ],
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
    ],
    entry: ['babel-polyfill', './index.js'],
    output: {
        path: __dirname,
        filename: 'chrome-remote-interface.js',
        libraryTarget: process.env.TARGET || 'commonjs2',
        library: 'CDP'
    }
};
