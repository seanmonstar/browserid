var shell = require('shelljs');
var path = require('path');
var test = shell.test,
    exec = shell.exec,
    mkdir = shell.mkdir,
    rm = shell.rm,
    mv = shell.mv,
    exit = shell.exit;

var VAR = path.join(__dirname, '../var');
var CERT = path.join(VAR, 'root.cert');

// if keys already exist, do nothing
if (test('-e', CERT)) {
  exit(0);
}

var GENERATE_KEYPAIR = path.join(__dirname, '../node_modules/.bin/generate-keypair');
var CERTIFY = path.join(__dirname, '../node_modules/.bin/certify');

if (!test('-e', GENERATE_KEYPAIR)) {
  console.error('cannot find generate-keypair from jwcrypto. try: npm install');
  exit(1);
}

if (!test('-e', CERTIFY)) {
  console.error('cannot find certify from jwcrypto. try: rm -rf node_modules && npm install');
  exit(1);
}

console.log('*** Generating ephemeral keys used for testing ***');

exec(GENERATE_KEYPAIR + ' -k 256 -a rsa');
if (!test('-e', VAR)) mkdir(VAR);
exec(CERTIFY + ' -s key.secretkey -p key.publickey', {silent: true}).output.to(CERT);
rm('key.publickey');
mv('key.secretkey', path.join(VAR, 'root.secretkey'));
