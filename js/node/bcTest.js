var bc = require('bcrypt');


console.log('\nSync:');
var salt = bc.gen_salt_sync(10);
console.log('Salt: ' + salt);

var pwClean = 'HalloThere';
console.log('Password(clean): ' + pwClean);

var pw = bc.encrypt_sync(pwClean, salt);
console.log('Password: ' + pw);

console.log('Compared: ' + bc.compare_sync(pwClean, pw));
console.log('Compared(alterd): ' + bc.compare_sync(pwClean + '1', pw));


var Step = require('step');
console.log('\n\nAsync:');
Step(
    function getSalt() {
      bc.gen_salt(10, this);
    },
    function cryptPW(err, salt) {
      if(err) console.warn(err);
      console.log('Salt: ' + salt);
      console.log('Password(clean): ' + pwClean);
      bc.encrypt(pwClean, salt, this);
    },
    function comparePW(err, crypted) {
      if(err) console.warn(err);
      console.log('Password: ' + crypted);
      bc.compare(pwClean, crypted, this);
    },
    function result(err, same) {
      if(err) console.warn(err);
      console.log('Compared: ' + same);
    }
);

