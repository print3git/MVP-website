const { config } = require('dotenv');
config();

const app = require('./src/app');
const { getEnv } = require('./src/env');

getEnv();

module.exports = app;
module.exports.default = app;
module.exports.app = app;
