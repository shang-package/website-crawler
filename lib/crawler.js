const Promise = require('bluebird');
const iconv = require('iconv-lite');
const retry = require('retry');
const request = require('request');

const rp = Promise.promisify(request, { multiArgs: true });
const { userAgents } = require('./constants');
const RetryStrategy = require('./retry-strategy');

const svc = {
  retryLog(err, requestOptions, proxies, retryIndex) {
    // eslint-disable-next-line no-console
    console.warn(`${retryIndex} -- proxy: ${proxies[retryIndex]} -- uri: ${requestOptions.uri || requestOptions.url} -- errMessage: ${err.message}`);
  },
  transformRequestOptions(requestOptions, proxies = [null], retryIndex = 0) {
    this.encodeURI(requestOptions);
    this.setProxy(requestOptions, proxies, retryIndex);
    this.setUserAgent(requestOptions);
    this.setMaxTimeOut(requestOptions);
    this.setEncoding(requestOptions);
  },
  encodeURI(requestOptions) {
    if (requestOptions.uri) {
      requestOptions.uri = encodeURI(requestOptions.uri);
    }
    else if (requestOptions.url) {
      requestOptions.url = encodeURI(requestOptions.url);
    }
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
  changeEncoding(data, encoding, noCheck) {
    let val = iconv.decode(data, encoding || 'utf8');
    if (!noCheck && encoding !== 'gbk' && val.indexOf('�') !== -1) {
      val = iconv.decode(data, 'gbk');
    }
    return val;
  },
  requestResolveStream(requestOptions, requestRetryStrategy) {
    return new Promise((resolve, reject) => {
      let req = request(requestOptions);
      req.on('error', (err) => {
        return requestRetryStrategy(err, null, requestOptions)
          .then(() => {
            // eslint-disable-next-line no-console
            console.warn('with err but ignored: ', err);
            return resolve({
              toStream() {
                return req;
              },
            });
          })
          .catch(reject);
      });

      req.on('response', (res) => {
        // pause the stream so that it isn't flowing during the async promise hop
        res.pause();

        return requestRetryStrategy(null, res, requestOptions)
          .then(() => {
            return resolve({
              response: res,
              toStream() {
                res.resume();
                return req;
              }
            });
          })
          .catch((e) => {
            res.resume();
            reject(e);
          });
      });
    });
  },
  requestResolveBody(requestOptions, requestRetryStrategy) {
    return rp(requestOptions)
      .spread((response, body) => {
        return requestRetryStrategy(null, response, requestOptions)
          .then((data = body) => {
            return [data, response];
          });
      }, (err) => {
        return requestRetryStrategy(err, null, requestOptions)
          .then((data) => {
            return [data];
          });
      });
  },
  // eslint-disable-next-line max-len
  requestFaultTolerantResolve(requestOptions, { proxies = [null], requestRetryStrategy = RetryStrategy.all, retryLog = svc.retryLog, retries = proxies.length - 1, stream, disableTransformRequestOptions }) {
    return new Promise((resolve, reject) => {
      let operation = retry.operation({
        retries,
        minTimeout: 0,
        maxTimeout: 0,
      });

      operation.attempt((currentAttempt) => {
        let retryIndex = currentAttempt - 1;

        if (!disableTransformRequestOptions) {
          this.transformRequestOptions(requestOptions, proxies, retryIndex);
        }

        return Promise
          .try(() => {
            if (stream) {
              return this.requestResolveStream(requestOptions, requestRetryStrategy);
            }

            return this.requestResolveBody(requestOptions, requestRetryStrategy);
          })
          .then(resolve)
          .catch((e) => {
            if (operation.retry(e)) {
              if (retryLog) {
                retryLog(e, requestOptions, proxies, retryIndex);
              }

              return;
            }

            reject(e);
          });
      });
    });
  },
  crawler(requestOptions, config = {}) {
    return this.requestFaultTolerantResolve(requestOptions, config)
      .then((result) => {
        if (config.stream) {
          return result;
        }

        let body;
        if (!config.disableChangeEncoding) {
          body = this.changeEncoding(result[0],
            requestOptions.__origin_encoding__,
            config.disableEncodingCheck
          );
        }
        else {
          body = result[0];
        }

        if (config.resolveWithFullResponse) {
          return [body, result[1]];
        }

        return body;
      });
  },
};

module.exports = svc;
