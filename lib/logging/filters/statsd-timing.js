/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const config = require('../../configuration');
const PREFIX = "browserid." + config.get('process_type') + ".";

var TimingRegExpMatches = [
  /^bcrypt.compare_time\b/,
  /^query_time\b/,
  /^certification_time\b/,
  /^assertion_verification_time\b/,
  /^elapsed_time\.(.*)/
];

function getMatch(msg) {
  for (var i = 0, regExp; regExp = TimingRegExpMatches[i]; ++i) {
    if (regExp.test(msg)) return regExp;
  }
}

exports.test = function(msg) {
  return !!getMatch(msg);
};

exports.toType = function(msg) {
  var match = getMatch(msg);

  // Use the capturing part of the match for the message.
  if (match instanceof RegExp) {
    match = msg.match(match);
    msg = match[1] || match[0];
  }

  return PREFIX + String(msg).split(' ')[0];
};


