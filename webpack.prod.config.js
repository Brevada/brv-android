var webpack = require('webpack');
var devConfig = require('./webpack.config');

module.exports = Object.assign(devConfig, {
    'plugins': (devConfig.plugins || []).concat([
        new webpack.optimize.UglifyJsPlugin({
            compress: process.env.NODE_ENV === 'production'
        }),
        new webpack.optimize.AggressiveMergingPlugin(),
        new webpack.optimize.OccurrenceOrderPlugin()
    ])
});
