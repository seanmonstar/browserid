"use strict";
var shell = require('shelljs');

var oldPwd = shell.pwd();
shell.cd(__dirname);

shell.cp('-f', '../node_modules/jwcrypto/bidbundle.js', '../resources/static/common/js/lib/bidbundle.js');
shell.cp('-f', '../node_modules/gobbledygook/gobbledygook.js', '../resources/static/common/js/lib/gobbledygook.js');

shell.exec('node ./generate_ephemeral_keys.js');

shell.cd(oldPwd);
