const RETRIABLE_ERRORS = ['ECONNRESET', 'ENOTFOUND', 'ESOCKETTIMEDOUT', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'EPIPE', 'EAI_AGAIN'];

const strategy = {
  HTTPError: function (response) {
    return response && 500 <= response.statusCode && response.statusCode < 600;
  },
  NetworkError: function (err) {
    return err && RETRIABLE_ERRORS.indexOf(err.code) !== -1;
  },
  HTTPOrNetworkError: function (err, response) {
    return strategy.HTTPError(response) || strategy.NetworkError(err);
  },
  ClientError: function (response) {
    return response && 400 <= response.statusCode && response.statusCode < 500;
  },
  all: function (err, response) {
    return err || strategy.HTTPOrNetworkError(response) || strategy.ClientError(response);
  },
};

module.exports = strategy;