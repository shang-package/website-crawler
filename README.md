# website-crawler

## example

```js
const crawler = require('website-crawler');

crawler(
  {
    url: 'https://www.google.com/'
  }, {
    proxies: [null, null],
  })
  .then((data) => {
    console.info(data);
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
})
```