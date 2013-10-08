#!/usr/bin/env node

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const assert = require('assert');
const vows = require('vows');
const start_stop = require('./lib/start-stop');
const config = require('../lib/configuration');
const StatsdHandler = require('../lib/logging/handlers/statsd');
const StatsdMock = require('./lib/statsd-mock');
const HttpMock = require('./lib/http-mock');

const logger = require('intel').getLogger('bid.test.statsd');

require('./lib/test_env');

var suite = vows.describe('statsd');

// disable vows (often flakey?) async error behavior
suite.options.error = false;

start_stop.addStartupBatches(suite);

function withProcess(name) {
  return "browserid." + config.get('process_type') + "." + name;
}

var IncrementMessagesToTest = {
  "assertion_failure": withProcess("assertion_failure"),
  "wsapi_code_mismatch.wsapi_url": withProcess("wsapi_code_mismatch.wsapi_url"),
  "wsapi.wsapi_url": withProcess("wsapi.wsapi_url"),
  "uncaught_exception": withProcess("uncaught_exception")
};

for (var logMessage in IncrementMessagesToTest) {
  (function(logMessage, expectedCounterName) {
    var batchConfig = {};
    batchConfig[logMessage + " - increments"] = {
      topic: function() {
        this.statsd = new StatsdMock();
        this.statsdTransport = new StatsdHandler({
          statsd: this.statsd
        });
        this.statsdTransport.handle(logger.makeRecord(logger._name, logger.INFO, logMessage, [logMessage, {
          field: "value"
        }])).done(this.callback);
      },
      "succeeds": function(err) {
        assert.ifError(err);
      },
      "and reports to statsd": function() {
        // the process name is prepended onto the counter name
        assert.equal(this.statsd.lastIncrement, expectedCounterName);
        assert.equal(this.statsd.lastIncrementInfo.field, "value");
      }
    };

    suite.addBatch(batchConfig);
  }(logMessage, IncrementMessagesToTest[logMessage]));
}

var TimingMessagesToTest = {
  "bcrypt.compare_time": "browserid.vows.bcrypt.compare_time",
  "query_time": "browserid.vows.query_time",
  "certification_time": "browserid.vows.certification_time",
  "assertion_verification_time": "browserid.vows.assertion_verification_time",
  "elapsed_time.fetch_well_known.success": "browserid.vows.fetch_well_known.success",
  "elapsed_time.fetch_well_known.error": "browserid.vows.fetch_well_known.error",
  "elapsed_time.deep_fetch_well_known.success": "browserid.vows.deep_fetch_well_known.success",
  "elapsed_time.deep_fetch_well_known.error": "browserid.vows.deep_fetch_well_known.error"
};

for (var logMessage in TimingMessagesToTest) {
  (function(logMessage, expectedCounterName) {
    var batchConfig = {};
    batchConfig[logMessage + " - times"] = {
      topic: function() {
        this.statsd = new StatsdMock();
        this.statsdTransport = new StatsdHandler({
          statsd: this.statsd
        });
        this.statsdTransport.handle(logger.makeRecord(logger._name, logger.INFO, logMessage, [logMessage, 768])).done(this.callback);
      },
      "succeeds": function(err) {
        assert.ifError(err);
      },
      "and reports to statsd": function() {
        // the process name is prepended onto the counter name
        assert.equal(this.statsd.lastTiming, expectedCounterName);
        assert.equal(this.statsd.lastTimingInfo, 768);
      }
    };

    suite.addBatch(batchConfig);
  }(logMessage, TimingMessagesToTest[logMessage]));
}


start_stop.addShutdownBatches(suite);

// run or export the suite.
if (process.argv[1] === __filename) suite.run();
else suite.export(module);

