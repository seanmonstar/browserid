/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const fs = require('fs');

const request = require('./request');
const logger = require('./logging').logger;
const util = require('util');
const validate = require('./validate');

const WELL_KNOWN_PATH = '/.well-known/browserid-realm';

const SHIMMED_REALMS = {};

// Support for "shimmed realms" for local development.
// CSV values:
//  <realm>|<browserid-realm filepath>,
if (process.env.SHIMMED_REALMS) {
  process.env.SHIMMED_REALMS.split(',').forEach(function(shim) {
    var parts = shim.split('|');
    SHIMMED_REALMS[parts[0]] = parts[1]; // realm name, filepath
    logger.info("shimmed realm info for " + parts[0]);
  });
}


function isJsonType(res) {
  var contentType = res.headers['content-type'];
  return contentType && contentType.indexOf('application/json') === 0;
}

function onRealmInfo(err, body, callback) {
  if (err) {
    // just pass err
  } else if (!(body && body.realm)) {
    err = new Error('missing realm json');
  } else if (!util.isArray(body.realm)) {
    err = new Error('realm property is not an array');
  } else {
    body.realm = body.realm.filter(function(value) {
      try {
        validate.is.origin(value);
        return true;
      } catch(err) {
        return false;
      }
    });
  }
  callback(err, body);
}

function loadShimmedRealm(realm, callback) {
  fs.readFile(SHIMMED_REALMS[realm], function(err, str) {
    var body;
    if (err) {
      logger.debug(err); // io error?
    } else {
      try {
        body = JSON.parse(str);
      } catch (jsonErr) {
        err = jsonErr;
      }
    }
    onRealmInfo(err, body, callback);
  });
}

exports.checkSupport = function realmSupport(realm, callback) {
  if (SHIMMED_REALMS[realm]) {
    loadShimmedRealm(realm, callback);
  } else {
    request('https://' + realm + WELL_KNOWN_PATH, { json: true }, function onRequest(err, res, body) {
      if (err) {
        logger.debug(err);
      } else if (!isJsonType(res)) {
        // strict here so that file isn't added to site by mistake. admin
        // must want this file to exist by explicitly setting headers
        err = new Error("content-type was not application/json");
        body = null;
      }

      onRealmInfo(err, body, callback);
    });
  }
};

