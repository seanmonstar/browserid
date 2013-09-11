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
fs = require('fs'),
util = require('util'),
os = require('os'),
path = require('path');

const REALM = "127.0.0.1";

const SHIMMED_FILE = path.join(os.tmpDir(), 'tmp-' + process.pid + (Math.random() * 0x1000000000).toString(36));

process.env.SHIMMED_REALMS = REALM + "|" + SHIMMED_FILE;

var suite = vows.describe('realm-info');

suite.options.error = false;

start_stop.addStartupBatches(suite);


function makeRealmRequest(body) {
  return function() {
    var self = this;

    fs.writeFile(SHIMMED_FILE, JSON.stringify(body), function(err) {
      if (err) return self.callback(err);
      wsapi.get('/wsapi/realm_info', {
        realm: REALM
      }).apply(self);
    });
  };
}

suite.addBatch({
  "realm_info with a valid realm": {
    topic: makeRealmRequest({
      realm: ["https://foo.doesnt.exist"]
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
    topic: makeRealmRequest({}),
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
    topic: makeRealmRequest({
      foo: 'bar'
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
    topic: makeRealmRequest({
      realm: 'foo.com'
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
    topic: makeRealmRequest({
      realm: [
        'foo.doesnt.exist', // missing scheme
        true, // not a string
        'http://foo.bam:8030', //VALID
        'https://foo.doesnt.exist/bad/path' // includes path
      ]
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

suite.addBatch({
  "cleanup tmp file": {
    topic: function() {
      fs.unlink(SHIMMED_FILE, this.callback);
    },
    "successfully": function(err) {
      assert.ifError(err);
    }
  }
});

start_stop.addShutdownBatches(suite);

// run or export the suite.
if (process.argv[1] === __filename) suite.run();
else suite.export(module);
