/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const util = require('util');
const intel = require('intel');
const filter = require('../filters/metrics');

function MetricsFormatter() {
  intel.Formatter.apply(this, arguments);
}
util.inherits(MetricsFormatter, intel.Formatter);

MetricsFormatter.prototype.format = function metricsFormat(record) {
  // we want the message adjusted when outputting here
  record.message = JSON.stringify(filter.toEntry(record.message, record.args[1]));
  var ret = intel.Formatter.prototype.format.call(this, record);
  record.message = record.args[0];
  return ret;
};

module.exports = MetricsFormatter;
