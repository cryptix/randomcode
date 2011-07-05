var crypto = require('crypto');
var fs = require('fs');

var cstr = 'U2FsdGVkX1+eo8UipHtNThvPE77IsqU7ZG9BTElV4ZcqrEWLCghbvbtaUPuwEnPQ';
var plain = 'ThisIsMyClearTEXT!\nThisIsMyClearTEXT!\nThisIsMyClearTEXT!\n';

function decipher(cstr) {
    var dec = crypto.createDecipher('aes-256-cbc', 'TestKey');

    var plain = dec.update(cstr,'binary', 'utf8');
    plain += dec.final('utf8');

    return plain;
}

function cipher(plain) {
    var enc = crypto.createCipher('aes256', 'TestKey');
    
    var cstr = enc.update(plain, 'utf8', 'binary');
    cstr += enc.final('binary');
    
   return cstr;
}


function decFromFile (fname) {
    var s = fs.ReadStream(fname, {encoding: 'binary'});
    var dec = crypto.createDecipher('aes256', 'TestKey');
        
    var plain = '';
    
    s.on('data', function(d) {
        var str = new Buffer(d).toString('base64');
        plain += dec.update(str, 'base64', 'utf8');
    });

    s.on('end', function() {
        plain += dec.final('utf8');
        console.log(plain);
    });
}

//console.log(decipher(cipher(plain)));

// created with
// echo -e 'ThisIsMyClearTEXT!\nThisIsMyClearTEXT!\nThisIsMyClearTEXT!\n' | openssl enc -aes256 -e -k 'TestKey' -out ramsch
decFromFile('ramsch');
