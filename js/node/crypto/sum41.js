#!/usr/bin/env node

var crypto = require('crypto');
var fs = require('fs');


var comPub = fs.readFileSync(__dirname + '/Company.public.pem', 'ascii');
var devPriv = fs.readFileSync(__dirname + '/Device.private.pem', 'ascii');


exports.verifyNdecrypt = function(dir, cb) {
    var s1 = crypto.createSign('RSA-SHA1')
                   
    var files =  ['blob', 'blob.sig', 'keks', 'keks.sig'],
        count = files.length;               
    
    files.forEach(function(f) {
       var s = fs.ReadStream(f);
       s.on('data', function(d) {
         shasum.update(d);
       });

       s.on('end', function() {
         var d = shasum.digest('hex');
         count -= 1;
         if(count == 0) cb();
         console.log(d + '  ' + filename);
       });
       
    });
    
    
    var verified = crypto.createVerify('RSA-SHA1')
                         .update('Test')
                         .update('123')
                         .verify(certPem, s1, 'base64');

}

var s = fs.ReadStream(filename);

s.on('data', function(d) {
  shasum.update(d);
});

s.on('end', function() {
  var d = shasum.digest('hex');
  console.log(d + '  ' + filename);
});

