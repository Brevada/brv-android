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
    plugins: [
        new webpack.DefinePlugin({
            SERVER_URL: process.env.NODE_ENV === 'production' ?
                         JSON.stringify(process.env.SERVER_URL || "https://beta.brevada.com") :
                         JSON.stringify(process.env.DEV_URL || "http://localhost"),
            API_VERSION: JSON.stringify(process.env.API_VERSION || "v1.1"),
            ADMIN_PASSWORD: JSON.stringify("Brevada123")
        })
    ],
    cache: true,
    resolve: {
        modules: [
            path.join(__dirname, 'src'),
            'node_modules'
        ],
        extensions: ['.js']
    }
};
