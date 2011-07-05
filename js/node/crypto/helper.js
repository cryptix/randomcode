var crypto = require('crypto'),
    fs = require('fs'),
    assert = require('assert');

// test strings
var cstr = 'dpi/tu8JG0OoXXs1kF6Z5rO5lYSZdri3l4yeolWLea5RAmF/yO7nFdvYjd5pIvk4zm/g6AQWITS3sQs+hBz+dA==';
var plain = 'ThisIsMyClearTEXT!\nThisIsMyClearTEXT!\nThisIsMyClearTEXT!\n';

var key = 'TestKey!123';

var scheme = 'aes256';
var cryptEnc = 'base64';
var clearEnc = 'utf8';

function decipher(cstr) {
    var dec = crypto.createDecipher(scheme, key);

    var plain = '';

    plain += dec.update(cstr, cryptEnc, clearEnc);
    plain += dec.final(clearEnc);

    return plain;
}

function cipher(plain) {
    var enc = crypto.createCipher(scheme, key);
    
    var cstr = '';

    cstr += enc.update(plain, clearEnc, cryptEnc);
    cstr += enc.final(cryptEnc);
    
   return cstr;
}


//console.log(decipher(cstr));
//console.log(cipher(plain));

assert.equal(decipher(cipher(plain)), plain);
assert.equal(cipher(decipher(cstr)), cstr);

/*
var f = fs.createWriteStream('help/test1');
f.write(cipher(plain));
*/

/*
function decFromFile (fname) {
    var s = fs.ReadStream(fname, {encoding: cryptEnc});
    var dec = crypto.createDecipher(scheme, key);
        
    var plain = '';
    
    s.on('data', function(d) {
        plain += dec.update(d, cryptEnc, clearEnc);
    });

    s.on('end', function() {
        plain += dec.final(clearEnc);
        return plain;
    });
}

// created with
// echo -e 'ThisIsMyClearTEXT!\nThisIsMyClearTEXT!\nThisIsMyClearTEXT!\n' | openssl enc -aes256 -e -k 'TestKey' -out ramsch
//decFromFile('ramsch');
*/
