/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const util = require('util');
const intel = require('intel');
const StatsD = require('node-statsd').StatsD;
const logger = require('../logging').getLogger('bid.logging.statsd');
const config = require('../../configuration');
const timing_filter = require('../filters/statsd-timing');
const increment_filter = require('../filters/statsd-increment');

"use strict";

function StatsdHandler(options) {
  options = options || {};
  this.statsd = options.statsd || getStatsdIfEnabled();
  intel.Handler.call(this, options);
}
util.inherits(StatsdHandler, intel.Handler);

StatsdHandler.prototype.emit = function(record, callback) {
  if ( ! this.statsd) return callback();
  var meta = record.args[ record.args.length - 1 ];

  if (increment_filter.test(record.message)) {
    this.statsd.increment(increment_filter.toType(record.args[0]), meta);
  } else if (timing_filter.test(record.message)) {
    this.statsd.timing(timing_filter.toType(record.args[0]), meta, meta);
  } else if (record.stack) {
    // increment_filter will handle uncaught_exceptions
    // this will increment all CAUGHT exceptions that are logged
    this.statsd.increment(timing_filter.toType('exception'), record.stack);
  }

  callback();
};


function getStatsdIfEnabled() {
  var statsdConfig = config.get('statsd');
  if (statsdConfig && statsdConfig.enabled) {
    var statsdOptions = {};
    statsdOptions.host = statsdConfig.host || "localhost";
    statsdOptions.port = statsdConfig.port || 8125;

    return new StatsD(statsdOptions.host, statsdOptions.port);
  }
}


module.exports = StatsdHandler;
