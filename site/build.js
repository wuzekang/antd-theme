const webpack = require('webpack');
const config = require('./webpack.config');

process.env.NODE_ENV = 'development';
webpack(config).run();
