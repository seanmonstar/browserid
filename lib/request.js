const http = require('http');
const https = require('https');
const parse = require('url').parse;

const config = require('./configuration');

const REQUEST_TIMEOUT = config.get('declaration_of_support_timeout_ms');
const HTTP_PROXY = config.has('http_proxy') ? config.get('http_proxy') : null;

function request(url, options, callback) {
    // in many cases the http layer can send both an 'error' and an 'end'.  In
  // other cases, only 'error' will be emitted.  We want to
  // ensure the client callback is invoked only once.  this function does it.
  var cb = function() {
    if (callback) {
      callback.apply(null, arguments);
      callback = null;
    }
  };


  function handleResponse(res) {
    if (res.statusCode !== 200) {
      return callback(new Error('non-200 response code'));
    }

    var contentType = res.headers['content-type'];
    if (options.json && (!contentType || contentType.indexOf('application/json') !== 0)) {
      return callback(new Error('non "application/json" response'));
    }

    var body = "";
    res.on('data', function(chunk) { body += chunk; });
    res.on('end', function() {
      if (options.json) {
        try {
          body = JSON.parse(body);
        } catch (err) {
          return cb(err, res, body);
        }
      }
      cb(null, res, body);
    });
  }

  var req;
  var parts = parse(url);
  var proxy = options.proxy;
  if (proxy && proxy.port && proxy.host) {
    // In production we use Squid as a reverse proxy cache to reduce how often
    // we request this resource.
    req = http.get({
      host: proxy.host,
      port: proxy.port,
      path: url,
      agent: false,
      headers: {
        host: parts.host
      }
    }, handleResponse);
  } else {
    parts.rejectUnauthorized = true;
    parts.agent = false;
    req = https.get(parts, handleResponse);
  }

  // front-end shows xhr delay message after 10 sec; timeout sooner to avoid this
  if (options.timeout) {
    var reqTimeout = setTimeout(function() {
      req.abort();
      cb(new Error('timeout trying to load ' + url));
    }, options.timeout);
    req.on('response', function() { clearTimeout(reqTimeout); });
  }

  req.on('error', function(e) {
    if (reqTimeout) { clearTimeout(reqTimeout); }
    cb(e);
  });
}

module.exports = function browserid_request(url, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  if (HTTP_PROXY) {
    options.proxy = {
      protocol: 'http:',
      hostname: HTTP_PROXY.host,
      port: HTTP_PROXY.port
    };
  }

  if (!('timeout' in options)) {
    options.timeout = REQUEST_TIMEOUT;
  }


  request(url, options, callback);
};

