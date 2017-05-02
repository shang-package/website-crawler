const Promise = require('bluebird');
const RETRIABLE_ERRORS = ['ECONNRESET', 'ENOTFOUND', 'ESOCKETTIMEDOUT', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'EPIPE', 'EAI_AGAIN'];

const strategy = {
  HTTPError: function (response) {
    return Promise.try(() => {
      if (response && 500 <= response.statusCode && response.statusCode < 600) {
        return Promise.reject(new Error('HTTPError, status Code = ' + response.statusCode));
      }
    });
  },
  NetworkError: function (err) {
    return Promise.try(() => {
      if (err && RETRIABLE_ERRORS.indexOf(err.code) !== -1) {
        return Promise.reject(new Error('NetworkError, errorName = ' + err.code));
      }
    });
  },
  HTTPOrNetworkError: function (err, response) {
    return Promise
      .try(() => {
        return strategy.HTTPError(response);
      })
      .then(() => {
        return strategy.NetworkError(err);
      });
  },
  ClientError: function (response) {
    return Promise.try(() => {
      if (response && 400 <= response.statusCode && response.statusCode < 500) {
        return Promise.reject(new Error('ClientError, status Code = ' + response.statusCode));
      }
    });
  },
  all: function (err, response) {
    return Promise
      .try(() => {
        if (err) {
          return Promise.reject(err);
        }
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