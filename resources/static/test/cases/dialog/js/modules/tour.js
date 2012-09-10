/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function() {
  "use strict";

  var controller,
      bid = BrowserID,
      testHelpers = bid.TestHelpers;

  module("dialog/js/modules/tour", {
    setup: function() {
      testHelpers.setup();
    },
    teardown: function() {
      if (controller) {
        try {
          controller.destroy();
          controller = null;
        } catch (e) {
          // could already be destroyed from the close
        }
      }
      testHelpers.teardown();
    }
  });

  function createController() {
    controller = bid.Modules.Tour.create();
    controller.start({});
  }

  test("body has tour className", function() {
    equal($("body").hasClass("tour"), false, "doesn't have tour class before start");
    createController();
    ok($("body").hasClass("tour"), "has tour class after start");
  })

})();
