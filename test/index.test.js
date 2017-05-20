const { test } = require('ava');
const Promise = require('bluebird');
const crawler = require('../index');

const request = crawler.request;
const RetryStrategy = crawler.RetryStrategy;

/* eslint-disable no-console */

test('crawler default', (t) => {
  return crawler(
    {
      url: 'https://www.baidu.com'
    })
    .then((body) => {
      t.true(!!body === true);
    });
});

test('crawler with proxies', (t) => {
  return crawler(
    {
      url: 'https://www.google.com'
    }, {
      proxies: ['http://127.0.0.1:1087'],
    })
    .then((body) => {
      t.true(!!body === true);
    })
    .catch((e) => {
      console.warn(e);
    });
});

test('crawler with resolveWithFullResponse', (t) => {
  return crawler(
    {
      url: 'https://www.google.com'
    }, {
      resolveWithFullResponse: true,
      proxies: ['http://127.0.0.1:1087'],
    })
    .spread((body, response) => {
      t.true(response.statusCode === 200);
      t.true(!!body === true);
    })
    .catch((e) => {
      console.warn(e);
    });
});

test('crawler with requestRetryStrategy', (t) => {
  return crawler(
    {
      url: 'https://github.com/404'
    }, {
      resolveWithFullResponse: true,
      proxies: ['http://127.0.0.1:1087'],
      requestRetryStrategy(err, response) {
        return Promise.try(() => {
          if (response && response.body) {
            if (/Page not found/.test(response.body)) {
              return new Buffer('let body=true');
            }
          }

          return RetryStrategy.all(err, response);
        });
      },
    })
    .spread((body, response) => {
      t.true(response.statusCode === 200);
      t.true(/let body=true/.test(body) === true);
    })
    .catch((e) => {
      console.warn(e);
    });
});

test('crawler with retryLog', (t) => {
  return crawler(
    {
      url: 'https://www.google.com',
      timeout: 5000,
    }, {
      resolveWithFullResponse: true,
      proxies: [null, 'http://127.0.0.1:1087'],
      retryLog(err, requestOptions, proxies, retryIndex) {
        console.warn(`customer retryLog, ${retryIndex} -- proxy: ${proxies[retryIndex]} -- uri: ${requestOptions.uri || requestOptions.url} -- errMessage: ${err.message}`);
      },
    })
    .spread((body, response) => {
      t.true(response.statusCode === 200);
      t.true(!!body === true);
    })
    .catch((e) => {
      console.warn(e);
    });
});


test('crawler with disableTransformRequestOptions', (t) => {
  return new Promise((resolve, reject) => {
    crawler(
      {
        url: 'https://www.google.com',
        timeout: 1,
      }, {
        disableTransformRequestOptions: true,
        proxies: [null, null],
        retryLog(err, requestOptions) {
          if (requestOptions.headers !== undefined) {
            reject(new Error('disableTransformRequestOptions no work'));
          }
        },
      })
      .catch((e) => {
        resolve(e.message);
        return null;
      });
  })
    .then((data) => {
      t.true(data === 'ETIMEDOUT');
    });
});

test('crawlwer with zdfans example', (t) => {
  function getUrl(html) {
    /* eslint-disable no-eval */
    let jschlVc = html.match(/name="jschl_vc" value="(\w+)"/)[1];
    let pass = html.match(/name="pass" value="([^"]+)"/)[1];
    let str1 = html.match(/var\s+s.*;/)[0];
    let str2 = ';t=\'www.zdfans.com\';';
    let str3 = html.match(/\s*;.*(?=';\s*121)/)[0] || '';
    str3 = str3.replace(/a\.value\s*=/, 'var jschlAnswe=');

    let jschlAnswe = eval(`(function(){${str1 + str2 + str3}; return jschlAnswe}())`);
    return `http://www.zdfans.com/cdn-cgi/l/chk_jschl?jschl_vc=${encodeURIComponent(jschlVc)}&pass=${encodeURIComponent(pass)}&jschl_answer=${jschlAnswe}`;
  }


  let j = request.jar();

  let requestOptions = {
    url: 'http://www.zdfans.com',
    jar: j,
  };

  return crawler(requestOptions,
    {
      requestRetryStrategy(err, response) {
        return Promise
          .try(() => {
            if (err) {
              return Promise.reject(err);
            }
            return getUrl(crawler.changeEncoding(response.body));
          })
          .delay(3000)
          .then((url) => {
            requestOptions.url = url;
            return crawler(requestOptions, {
              disableTransformRequestOptions: true,
              resolveWithFullResponse: true,
            }, {
              retries: 0,
            });
          })
          .spread((body, res) => {
            console.info('response.statusCode: ', res.statusCode);
            return body;
          });
      },
    })
    .then((body) => {
      t.true(!!body);
    });
});

