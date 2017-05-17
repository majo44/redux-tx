let webpack = require('webpack');
let externals = require('./webpack.externals');
let packageName = require('./package').name;
let path = require('path');
let packageNameCamelCase = packageName.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });

module.exports = {
    context: __dirname,
    entry: "./index",
    externals: externals,
    output: {
        library: packageNameCamelCase,
        path: __dirname,
        filename: packageName + ".js",
        libraryTarget: "umd"
    },
    devtool: "#source-map",
    resolve: {
        alias : {
            "tslib" :   path.join(__dirname, "node_modules/tslib/tslib.js")
        }
    },
    plugins: []
};
