/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

BrowserID.Modules.Tour = (function() {
  "use strict";

  var bid = BrowserID,
      dom = bid.DOM,
      mediator = bid.Mediator,
      sc;

  function tourEnd() {
    mediator.publish('cancel_state');
  }

  var TourModule = bid.Modules.PageModule.extend({
    start: function tour_start(options) {
      this.renderTour("tour");

      this.click("#header .sign-in.button", tourEnd);
    },
    stop: function tour_stop() {
      sc.stop.call(this);
      this.hideTour();
    }
  });

  sc = TourModule.sc;

  return TourModule;

})();
