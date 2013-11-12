#!/usr/bin/env node
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


// finally, let's run a tiny webserver for the example code.
const express = require('express');
const path = require('path');
const querystring = require('querystring');

const sessions = require('client-sessions');
const postprocess = require('postprocess');
const urlparse = require('urlparse');

var exampleServer = express.createServer();

exampleServer.use(express.logger({ format: 'dev' }));
exampleServer.use(sessions({
  requestKey: 'session',
  cookieName: 'session',
  duration: 1000 * 60,
  secret: 'shhhh example rp, we\'re hunting wabbits'
}));
exampleServer.set('views', path.join(__dirname, '..', 'example', 'rp'));
exampleServer.set('view engine', 'ejs');
exampleServer.set('view options', {
  layout: false
});

if (process.env.PUBLIC_URL) {
  var burl = urlparse(process.env.PUBLIC_URL).validate().normalize().originOnly().toString();
  console.log('using browserid server at ' + burl);

  exampleServer.use(postprocess(function(req, buffer) {
    return buffer.toString().replace(new RegExp('https://login.persona.org', 'g'), burl);
  }));
}


exampleServer.use(express.bodyParser());

function verify(options, callback) {
  var verifier = urlparse(process.env.VERIFIER_URL);
  var meth = verifier.scheme === 'http' ? require('http') : require('https');
  var vreq = meth.request({
    host: verifier.host,
    port: verifier.port,
    path: verifier.path,
    method: 'POST'
  }, function(vres) {
    var body = "";
    vres.on('data', function(chunk) { body+=chunk; } )
        .on('end', function() {
          try {
            console.log(body);
            var verifierResp = JSON.parse(body);
            var valid = verifierResp && verifierResp.status === "okay";
            var email = valid ? verifierResp.email : null;
            if (valid) {
              console.log("assertion verified successfully for email:", email);
            } else {
              console.log("failed to verify assertion:", verifierResp);
            }
            callback(verifierResp);
          } catch(e) {
            console.log("non-JSON response from verifier");
            // bogus response from verifier!  return null
            callback(null);
          }
        });
  });
  vreq.setHeader('Content-Type', 'application/x-www-form-urlencoded');

  // An "audience" argument is embedded in the assertion and must match our hostname.
  // Because this one server runs on multiple different domain names we just use
  // the host parameter out of the request.
  var audience = options.audience;
  var params = {
    assertion: options.assertion,
    audience: audience,
    allowUnverified: options.allowUnverified
  };
  if (!! options.forceIssuer) params.forceIssuer = options.forceIssuer;
  var data = querystring.stringify(params);

  vreq.setHeader('Content-Length', data.length);
  vreq.write(data);
  vreq.end();
  console.log("verifying assertion!");

}

exampleServer.post('/process_assertion', function(req, res) {
  verify({
    audience: req.headers.host,
    assertion: req.body.assertion,
    forceIssuer: req.body.forceIssuer,
    allowUnverified: req.body.allowUnverified
  }, function(resp) {
    res.json(resp);
  });
});

exampleServer.get('/auth/verify', function(req, res) {
  var hash = encodeURIComponent('origin=http://' + req.headers.host + '&returnTo=' + req.url);
  res.redirect(process.env.PUBLIC_URL + '/sign_in#' + hash);
});

exampleServer.post('/auth/verify', function(req, res) {
  verify({
    audience: req.headers.host,
    assertion: req.body.assertion,
    allowUnverified: req.body.allowUnverified
  }, function(resp) {
    req.session[resp.status] = resp ? JSON.stringify(resp, null, 4) : null;
    res.redirect('/?' + urlparse(req.url).query || '');
  });
});

exampleServer.get('/', function(req, res) {
  var okay = req.session.okay;
  delete req.session.okay;
  res.render('declaritive', {
    noJavaScript: !!req.query.noJavaScript,
    noShim: !!req.query.noShim,
    query: req.query,
    querystring: urlparse(req.url).query || '',
    session: okay
  });
});

exampleServer.use(express.static(path.join(__dirname, "..", "example", "rp")));

exampleServer.listen(
  process.env.PORT || 10001,
  process.env.HOST || process.env.IP_ADDRESS || "127.0.0.1",
  function() {
    var addy = exampleServer.address();
    console.log("running on http://" + addy.address + ":" + addy.port);
  });
