# website-crawler

## example

```js
const crawler = require('website-crawler');

// base
crawler({
    url: 'https://www.google.com/'
  })
  .then((data) => {
    console.info(data);
  })
  .catch((e) => {
    console.warn(e);
  });

// with config
crawler({
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
    console.info('response.statusCode: ', response.statusCode);
  })
  .catch((e) => {
    console.warn(e);
  });

```

## config

```plain
crawler(requestOptions, {
  proxies?: String[],
  requestRetryStrategy?: function,
  retryLog?: function,
  retries?: Number,
  disableEncodingCheck?: Boolean,
  resolveWithFullResponse?: Boolean,
  disableTransformRequestOptions?: Boolean,
})
```