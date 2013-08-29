const request = require('request');
const config = require('./configuration');

const REQUEST_TIMEOUT = config.get('declaration_of_support_timeout_ms');
const HTTP_PROXY = config.has('http_proxy') ? config.get('http_proxy') : null;

module.exports = function browserid_request(url, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  if (HTTP_PROXY) {
    options.proxy = {
      protocol: 'http:',
      host: HTTP_PROXY.host,
      port: HTTP_PROXY.port
    };
  }

  if (!('timeout' in options)) {
    options.timeout = REQUEST_TIMEOUT;
  }

  options.strictSSL = true;

  request(url, options, callback);
};

