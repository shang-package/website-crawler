const Promise = require('bluebird');

const RETRIABLE_ERRORS = ['ECONNRESET', 'ENOTFOUND', 'ESOCKETTIMEDOUT', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'EPIPE', 'EAI_AGAIN'];

const strategy = {
  HTTPError(response) {
    return Promise.try(() => {
      if (response && response.statusCode >= 500 && response.statusCode < 600) {
        return Promise.reject(new Error(`HTTPError, status Code = ${response.statusCode}`));
      }
      return null;
    });
  },
  NetworkError(err) {
    return Promise.try(() => {
      if (err && RETRIABLE_ERRORS.indexOf(err.code) !== -1) {
        return Promise.reject(new Error(`NetworkError, errorName = ${err.code}`));
      }
      return null;
    });
  },
  HTTPOrNetworkError(err, response) {
    return Promise
      .try(() => {
        return strategy.HTTPError(response);
      })
      .then(() => {
        return strategy.NetworkError(err);
      });
  },
  ClientError(response) {
    return Promise.try(() => {
      if (response && response.statusCode >= 400 && response.statusCode < 500) {
        return Promise.reject(new Error(`ClientError, status Code = ${response.statusCode}`));
      }
      return null;
    });
  },
  all(err, response) {
    return Promise
      .try(() => {
        if (err) {
          return Promise.reject(err);
        }
        return null;
      })
      .then(() => {
        return strategy.HTTPOrNetworkError(err, response);
      })
      .then(() => {
        return strategy.ClientError(response);
      });
  },
};

module.exports = strategy;
