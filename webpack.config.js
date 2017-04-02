var webpack = require('webpack');
var path = require('path');

module.exports = {
    entry: {
        "vendor": ['babel-polyfill'],
        "index": ['./src/index.js']
    },
    output: {
        path: path.join(__dirname, 'www', 'js'),
        publicPath: '/js/',
        filename: '[name].js',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader?cacheDirectory'
            }
        ]
    },
    plugins: [],
    cache: true,
    resolve: {
        modules: [
            path.join(__dirname, 'src'),
            'node_modules'
        ],
        extensions: ['.js']
    }
};
