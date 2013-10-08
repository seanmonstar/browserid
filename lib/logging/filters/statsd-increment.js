/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const config = require('../../configuration');
const PREFIX = "browserid." + config.get('process_type') + ".";


var IncrementRegExpMatches = [
  /^assertion_failure\b/,
  /^wsapi_code_mismatch\./,
  /^wsapi\./,
  /^uncaught_exception\b/
];

exports.test = function(msg) {
  for (var i = 0, regExp; regExp = IncrementRegExpMatches[i]; ++i) {
    if (regExp.test(msg)) return true;
  }

  return false;
};

exports.toType = function(msg) {
  return PREFIX + String(msg);
};


