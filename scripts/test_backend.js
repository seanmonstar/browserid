/** This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/. */
var path = require('path');
var sep = process.platform === 'win32' ? ';' : ':';
var shell = require('shelljs');
var which = shell.which,
    echo = shell.echo,
    cd = shell.cd,
    ls = shell.ls,
    exec = shell.exec,
    env = shell.env,
    exit = shell.exit;

const SCRIPT_DIR = __dirname;
const BASEDIR = path.join(__dirname, '..');

env.PATH += sep + path.join(SCRIPT_DIR, '../node_modules/.bin');

const VOWS = which('vows');
if (!VOWS) {
  echo("vows not found in your path.  try:  npm install");
  exit(1);
}

// vows hates absolute paths.  sheesh.
cd(BASEDIR);

var code = exec('node ' + path.join(SCRIPT_DIR, 'test_db_connectivity.js')).code;
if (code === 0) {
  ls('tests/*.js').forEach(function (file) {
    echo(file);
    code = exec(VOWS + ' ' + file).code;
    if (code !== 0) exit(1);
  });
} else {
  echo('');
  echo("Can't run tests: can't connect to the database");
  echo('');
  exit(1);
}
