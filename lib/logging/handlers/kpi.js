/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const _ = require('underscore');
const util = require('util');
const intel = require('intel');
const kpi_data = require('../../kpi_data');
const logger = require('../logging').logger;
const config = require('../../configuration');
const filter = require('../filters/metrics');

const FIELDS_TO_SEND_TO_PIGGYBANK = [
  "type",
  "at",
  "user_agent",
  "idp",
  "rp"
];

function MetricsKpiggybankHandler(options) {
  options = options || {};
  this.queue = [];
  intel.Handler.call(this, options);
}
util.inherits(MetricsKpiggybankHandler, intel.Handler);

MetricsKpiggybankHandler.BATCH_SIZE = config.get('kpi.metrics_batch_size');

_.extend(MetricsKpiggybankHandler.prototype, {

  emit: function piggyEmit(record, callback) {
    // TODO config?
    if (!config.get('kpi.send_metrics')) return callback();


    var entry = toEntry(record.message, record.args[record.args.length - 1]);
    this.queue.push([entry, callback]);


    if (this.isQueueFull()) {
      this.flush();
    }
  },

  isQueueFull: function isQueueFull() {
    return this.queue.length >= MetricsKpiggybankHandler.BATCH_SIZE;
  },

  // the queue is an array of tuples (entry, callback)
  // so this.queue = [
  //   [entry, callback], ...
  // ]
  // Getting an entry then is: queue[index][0], or queue[0][0] to get
  // the first entry.
  getQueue: function getQueue() {
    return this.queue;
  },

  flush: function flush() {
    var kpis = this.queue.map(function(q) { return q[0]; });
    var callbacks = this.queue.map(function(q) { return q[1]; });
    this.reset();
    kpi_data.store(kpis, function(err, success) {
      if (!err) {
        if (success) {
          return callbacks.forEach(function(cb) { cb(); });
        } else {
          err = new Error('failed to store interaction data');
        }
      }
      callbacks.forEach(function(cb) { cb(err); });
    });
  },

  reset: function reset() {
    this.queue = [];
  }

});

function toEntry(msg, entry) {
  return whitelistedFields(filter.toEntry(msg, entry),
            FIELDS_TO_SEND_TO_PIGGYBANK);
}

function whitelistedFields(entry, whitelist) {
  var allowed = {};

  for (var key in entry) {
    if (whitelist.indexOf(key) > -1) allowed[key] = entry[key];
  }

  return allowed;
}


module.exports = MetricsKpiggybankHandler;
