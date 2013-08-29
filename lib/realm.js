/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const request = require('./request');
const logger = require('./logging').logger;
const util = require('util');
const validate = require('./validate');

const WELL_KNOWN_PATH = '/.well-known/browserid-realm';

function isJsonType(res) {
  var contentType = res.headers['content-type'];
  return contentType && contentType.indexOf('application/json') === 0;
}

exports.checkSupport = function realmSupport(realm, callback) {
  request(realm + WELL_KNOWN_PATH, { json: true }, function onRequest(err, res, body) {
    if (err) {
      logger.debug(err);
    } else if (!isJsonType(res)) {
      // strict here so that file isn't added to site by mistake. admin
      // must want this file to exist by explicitly setting headers
      err = new Error("content-type was not application/json");
      body = null;
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
  });
};

