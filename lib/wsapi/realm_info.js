/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
const realm = require('../realm');
const logger = require('../logging').logger;

exports.method = 'get';
exports.writes_db = false;
exports.authed = false;
exports.args = {
  realm: 'host'
};
exports.i18n = false;

exports.process = function realm_info(req, res) {
  var domain = req.params.realm.toLowerCase();
  realm.checkSupport(domain, function onRealm(err, body) {
    var json = {};
    if (err) {
      logger.info('"' + domain + '" realm support is misconfigured: ' + err);
      json.realm = [];
    } else {
      json.realm = body.realm;
    }

    res.json(json);
  });
};
