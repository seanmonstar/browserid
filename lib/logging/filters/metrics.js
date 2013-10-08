/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * message filter for metrics messages.
 *
 * Messages cared about:
 * signin
 * verify
 * stage_email.success
 * stage_reset.success
 * stage_reverify.success
 * stage_transition.success
 * stage_user.success
 * complete_email_confirmation.success
 * complete_reset.success
 * complete_transition.success
 * complete_user_creation.success
 * idp.auth_return
 * idp.auth_cancel
 * idp.create_new_user
*/

const intel = require('intel');
const _ = require('underscore');
const coarse = require('../../coarse_user_agent_parser');

var RegExpMatches = [
  /^signin\b/,
  /^verify\b/,
  /complete_(?:[^\.]+)\.success/,
  /stage_(?:[^\.]+)\.success/,
  /^metrics\.report\./,
  /^idp\.auth_.*/,
  /^idp\.create_new_user/
];

function filter(record) {
  var msg = record.message;
  for (var i = 0, regExp; regExp = RegExpMatches[i]; ++i) {
    if (regExp.test(msg)) return true;
  }

  return false;
}

function MetricsFilter() {
  return new intel.Filter(filter);
}

module.exports = MetricsFilter;

module.exports.toEntry = function(msg, entry) {
  // create a copy of the entry so that changing fields does not have
  // side effects elsewhere.
  if (typeof entry === 'object') entry = _.extend({}, entry);

  // allow convenient reporting of atoms by converting atoms into objects
  if (entry === null || typeof entry !== 'object') entry = { msg: entry };
  if (entry.type)
    throw "reported metrics may not have a `type` property, that's reserved";
  entry.type = String(msg).replace(/^metrics\.report\./, '').split(' ')[0];

  // timestamp
  if (entry.at)
    throw "reported metrics may not have an `at` property, that's reserved";
  entry.at = new Date().toUTCString();

  // only coarse UA strings can be sent to the backend.
  if (entry.browser)
    entry.user_agent = coarse.parse(entry.browser);

  return entry;
};


module.exports = MetricsFilter;