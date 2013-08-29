#!/usr/bin/env node

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* This tests excercises address_info and attempt to excercise all
 * possible response values from it.  */

require('./lib/test_env.js');

const assert =
require('assert'),
vows = require('vows'),
start_stop = require('./lib/start-stop.js'),
wsapi = require('./lib/wsapi.js'),
express = require('express'),
util = require('util'),
path = require('path');

const REALM_HOST = "127.0.0.1";
const REALM_PORT = 10020;
const REALM_URL = "http://" + REALM_HOST + ":" + REALM_PORT;

var suite = vows.describe('realm-info');

suite.options.error = false;

start_stop.addStartupBatches(suite);


var realmApp, realmServer;

function makeRealmRequest(responseHandler) {
  return function() {
    var self = this;
    if (realmServer) {
      realmServer.close(make);
    } else {
      make();
    }

    function make() {
      realmApp = express.createServer();
      realmApp.get('/.well-known/browserid-realm', function(req, res) {
        responseHandler(res);
      });
      realmServer = realmApp.listen(REALM_PORT, REALM_HOST, function() {
        wsapi.get('/wsapi/realm_info', {
          realm: REALM_URL
        }).apply(self);
      });
    }
  };
}

suite.addBatch({
  "realm_info with a valid realm": {
    topic: makeRealmRequest(function(res) {
      res.json({
        realm: ["https://foo.doesnt.exist"]
      });
    }),
    "returns json with a realm array": function(err, res) {
      assert.isNull(err);
      var obj = JSON.parse(res.body);
      assert.isArray(obj.realm);
      assert.equal(obj.realm[0], "https://foo.doesnt.exist");
    }

  }
});

// 404 should be ok
suite.addBatch({
  "realm_info with a non-existant well-known file": {
    topic: makeRealmRequest(function(res) {
      res.send(404);
    }),
    "returns json with an empty realm array": function(err, res) {
      assert.isNull(err);
      var obj = JSON.parse(res.body);
      assert.isArray(obj.realm);
      assert.lengthOf(obj.realm, 0);
    }

  }
});

// not application/json
suite.addBatch({
  "realm_info with a well-known file with wrong content-type": {
    topic: makeRealmRequest(function(res) {
      // passing a string should send text/html
      res.send(JSON.stringify({ realm: ["http://foo.com" ]}));
    }),
    "returns json with an empty realm array": function(err, res) {
      assert.isNull(err);
      var obj = JSON.parse(res.body);
      assert.isArray(obj.realm);
      assert.lengthOf(obj.realm, 0);
    }

  }
});

// missing realm property
suite.addBatch({
  "realm_info with a well-known file missing the realm property": {
    topic: makeRealmRequest(function(res) {
      // passing a string should send text/html
      res.json({
        foo: 'bar'
      });
    }),
    "returns json with an empty realm array": function(err, res) {
      assert.isNull(err);
      var obj = JSON.parse(res.body);
      assert.isArray(obj.realm);
      assert.lengthOf(obj.realm, 0);
    }

  }
});

// realm is not an array
suite.addBatch({
  "realm_info with a well-known file with realm property as non-array": {
    topic: makeRealmRequest(function(res) {
      // passing a string should send text/html
      res.json({
        realm: 'foo.com'
      });
    }),
    "returns json with an empty realm array": function(err, res) {
      assert.isNull(err);
      var obj = JSON.parse(res.body);
      assert.isArray(obj.realm);
      assert.lengthOf(obj.realm, 0);
    }

  }
});

// strings in realm aren't origins
suite.addBatch({
  "realm_info with a well-known file with realm values not origins": {
    topic: makeRealmRequest(function(res) {
      // passing a string should send text/html
      res.json({
        realm: [
          'foo.doesnt.exist', // missing scheme
          true, // not a string
          'http://foo.bam:8030', //VALID
          'https://foo.doesnt.exist/bad/path' // includes path
        ]
      });
    }),
    "returns json with an empty realm array": function(err, res) {
      assert.isNull(err);
      var obj = JSON.parse(res.body);
      assert.isArray(obj.realm);
      assert.lengthOf(obj.realm, 1);
      assert.equal(obj.realm[0], 'http://foo.bam:8030');
    }

  }
});


start_stop.addShutdownBatches(suite);

// run or export the suite.
if (process.argv[1] === __filename) suite.run();
else suite.export(module);
