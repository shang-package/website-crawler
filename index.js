const request = require('request');

const lib = require('./lib/crawler');
const RetryStrategy = require('./lib/retry-strategy');


module.exports = lib.crawler.bind(lib);
module.exports.transformRequestOptions = lib.transformRequestOptions.bind(lib);
module.exports.changeEncoding = lib.changeEncoding;
module.exports.RetryStrategy = RetryStrategy;
module.exports.request = request;
