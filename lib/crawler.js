const Promise = require('bluebird');
const iconv = require('iconv-lite');
const retry = require('retry');
const rp = Promise.promisify(require('request'), { multiArgs: true });
const { userAgents } = require('./constants');
const RetryStrategy = require('./retry-strategy');


const svc = {
  retryLog: function (err, requestOptions, proxies, currentAttempt) {
    console.warn(currentAttempt + ' -- proxy: ' + proxies[currentAttempt - 1] + ' -- uri: ' + (requestOptions.uri || requestOptions.url) + ' -- errMessage: ' + err.message);
  },
  transformRequestConfig(requestOptions, proxies, index) {
    this.setProxy(requestOptions, proxies, index);
    this.setUserAgent(requestOptions);
    this.setMaxTimeOut(requestOptions);
    this.setEncoding(requestOptions);
  },
  setEncoding(requestOptions) {
    // encoding 为 null 获取内容,方便转码
    requestOptions.__origin_encoding__ = requestOptions.encoding;
    requestOptions.encoding = null;
  },
  setProxy(requestOptions, proxies, index) {
    requestOptions.proxy = proxies[index] || null;
  },
  setUserAgent(requestOptions) {
    // 不存在 User-Agent 则 写入一个
    requestOptions.headers = requestOptions.headers || {};
    requestOptions.headers['User-Agent'] = requestOptions.headers['User-Agent'] ||
      userAgents[Math.floor(Math.random() * userAgents.length)];
  },
  setMaxTimeOut(requestOptions) {
    requestOptions.timeout = requestOptions.timeout || 15 * 1000;
  },
  changeEncoding: function (data, encoding, noCheck) {
    var val = iconv.decode(data, encoding || 'utf8');
    if (!noCheck && encoding !== 'gbk' && val.indexOf('�') !== -1) {
      val = iconv.decode(data, 'gbk');
    }
    return val;
  },
  requestFaultTolerantResolve(requestOptions, { proxies = [], requestRetryStrategy = RetryStrategy.all, retryLog = svc.retryLog, retries }) {
    if (!retries) {
      retries = proxies.length;
    }

    return new Promise((resolve, reject) => {
      let operation = retry.operation({
        retries,
        minTimeout: 0,
        maxTimeout: 0,
      });

      operation.attempt((currentAttempt) => {
        this.transformRequestConfig(requestOptions, proxies, currentAttempt);

        rp(requestOptions)
          .spread((response, body) => {
            return Promise
              .try(() => {
                return requestRetryStrategy(null, response);
              })
              .then((isRetry) => {
                if (isRetry) {
                  return Promise.reject(new Error('requestRetryStrategy error'));
                }

                return body;
              });
          }, (err) => {
            return Promise
              .try(() => {
                return requestRetryStrategy(err);
              })
              .then((isRetry) => {
                if (isRetry) {
                  return Promise.reject(err);
                }

                return err;
              });
          })
          .then(resolve)
          .catch((e) => {
            if (operation.retry(e)) {
              if (retryLog) {
                retryLog(e, requestOptions, proxies, currentAttempt);
              }

              return null;
            }

            reject(e);
          });
      });
    });
  },
  crawler(requestOptions, config) {
    return this.requestFaultTolerantResolve(requestOptions, config)
      .then((body) => {
        return this.changeEncoding(body, requestOptions.__origin_encoding__, config.disableEncodingCheck);
      });
  },
};

module.exports = svc.crawler;
