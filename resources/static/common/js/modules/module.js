/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
BrowserID.Modules = BrowserID.Modules || {};
BrowserID.Modules.Module = (function() {
"use strict";

  var bid = BrowserID,
      mediator = bid.Mediator;

  /*
   * Module is the root of all modules. Provides basic pub/sub mechanisms,
   * ability to start and stop, check for required arguments, etc.
   */

  var Module = BrowserID.Class({
    init: function(options) {
      this.subscriptions = [];
    },

    checkRequired: function(options) {
      var list = [].slice.call(arguments, 1);
      for(var item, index = 0; item = list[index]; ++index) {
        if(!options.hasOwnProperty(item)) {
          throw "missing config option: " + item;
        }
      }
    },

    start: function(options) {
      var self=this;
      self.options = options || {};
    },

    stop: function() {
      _.each(this.subscriptions, mediator.unsubscribe);
      this.subscriptions = [];
    },

    destroy: function() {
      this.stop();
    },

    /**
     * Publish a message to the mediator.
     * @method publish
     * @param {string} message
     * @param {object} data
     */
    publish: mediator.publish.bind(mediator),

    /**
     * Subscribe to a message on the mediator.
     * @method subscribe
     * @param {string} message
     * @param {function} callback
     * @param {object} [context] - context, if not given, use this.
     */
    subscribe: function(message, callback, context) {
      var id = mediator.subscribe(message, callback, context || this);
      this.subscriptions.push(id);
    },

    /**
     * Subscribe to all messages on the mediator.
     * @method subscribeAll
     * @param {function} callback
     * @param {object} [context] - context, if not given, use this.
     */
    subscribeAll: function(callback, context) {
      var id = mediator.subscribeAll(callback, context || this);
      this.subscriptions.push(id);
    }
  });

  return Module;

}());
