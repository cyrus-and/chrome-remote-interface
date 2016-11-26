const webpack = require('webpack');

module.exports = {
    externals: {
        'ws': 'window.ws',
        './externalRequest.js': 'window.criRequest'
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader'
            },
            {
                test: /\.json$/,
                loader: 'json'
            }
        ]
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            mangle: true,
            compress: {
                warnings: false
            },
            output: {
                comments: false
            }
        })
    ],
    entry: './webpack.entry.js',
    output: {
        libraryTarget: 'var',
        library: 'CDP',
        filename: 'chrome-remote-interface.js'
    }
};
