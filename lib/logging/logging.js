/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * A very thin wrapper around intel for general server logging.
 * Exports an intel Logger instance in exports.logger with several functions
 * corresponding to different log levels.  use it like this:
 *
 *     const logger = require('../libs/logging.js').logger;
 *     logger.debug("you can probably ignore this.  just for debugging.");
 *     logger.info("something happened, here's info about it!");
 *     logger.warn("this isn't good.  it's not a fatal error, but needs attention");
 *     logger.error("this isn't good at all.  I will probably crash soon.");
 *
 * All log messages from all types of logging are put over the Winston pipe.
 * Transports listen on the Winston pipe for messages that are of interest to
 * them, and take appropriate action. This occurs for file logging,
 * metrics logging, KPI logging, and statsd.
 *
 * CEF is slightly different, all CEF messages are sent over the pipe but
 * the cef interface takes care of writing to cef directly.
 */
const path = require('path');

const intel = require("intel");
const mkdirp = require('mkdirp');

const config = require('../configuration');

module.exports = intel;
// go through the configuration and determine log location

var log_path = path.join(config.get('var_path'), 'log');
if (!log_path)
  return console.log('no log path! Not logging!');
else
  mkdirp.sync(log_path, '0755');



var loggingOptions = config.get('logging');
loggingOptions.root = path.join(__dirname, '..');

if (loggingOptions.handlers && loggingOptions.handlers.file) {
  var filename = path.join(log_path, config.get('process_type') + '.log');
  loggingOptions.handlers.file.file = filename;
}

if (loggingOptions.handlers && loggingOptions.handlers.metrics) {
  var filename = path.join(log_path, config.get('process_type') + '-metrics.json');
  if (process.env.METRICS_LOG_FILE) {
    filename = process.env.METRICS_LOG_FILE;
  }
  loggingOptions.handlers.metrics.file = filename;
}

if (process.env.LOG_TO_CONSOLE) {
  loggingOptions.loggers.bid.handlers.push('console');
}

intel.config(loggingOptions);


