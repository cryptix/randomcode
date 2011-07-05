#!/usr/bin/env node

var crypto = require('crypto');
var cp = require('child_process');
var path = require('path');
var fs = require('fs');

// company side
var comPriv = fs.readFileSync(__dirname + '/Company.private.pem', 'ascii');
var devPub = fs.readFileSync(__dirname + '/Device.public.pem', 'ascii');

// device side
var comPub = fs.readFileSync(__dirname + '/Company.public.pem', 'ascii');
var devPriv = fs.readFileSync(__dirname + '/Device.private.pem', 'ascii');


exports.recvANDdec = function(zipf, cb) {
    var files = { // keep buffers here
    };
    
    
    function readFiles(zipf) {
        // -n = dont replace. for testing
        var child = cp.exec('unzip -n ' + zipf, function (error, stdout, stderr) {
            if (error !== null) {
                return cb('exec unzip error: ' + error, null);
            }

            var flist = ['blob', 'blob.sig', 'skey', 'skey.sig'],
                fcount = 4;

            flist.forEach(function(f) {
                fs.stat(f, function(err, stat) {

                    var offset = 0;
                    fstream = fs.createReadStream(f);

                    files[f] = new Buffer(stat.size);

                    fstream.on('data', function(d) {
                        //console.warn('write %d bytes from %s at offset %d', d.length, f, offset);
                        d.copy(files[f], 0, offset);
                        offset += d.length;
                    });

                    fstream.on('end', function() {
                        fcount -= 1;
                        if (fcount === 0) verify(); // all read
                    });

                });
            });
        });
    }

    function verify() {
        console.warn('# verifying blob and skey against company key');

        var verifyBlob = crypto.createVerify('RSA-SHA1');
        var verifySKey = crypto.createVerify('RSA-SHA1');

        // verify blob
        verifyBlob.update(files['blob']);
        var v = verifyBlob.verify(comPub, files['blob.sig']);
        if(v !== 0) {
            return cb('ERR - Blob did not verify:' + v, null);
        }

        // verify skey
        verifySKey.update(files['skey']);
        var v = verifySKey.verify(comPub, files['skey.sig']);
        if(v === 0) {
            decryptSkey();
        } else {
            cb('ERR - Skey did not verify:' + v, null);
        }
    }

    function decryptSkey() {
        console.warn('# decrypting skey with device priv key')
        // meh - no rsautl on crypto module...?
        var rsautl = cp.spawn('openssl', ['rsautl', '-decrypt', '-inkey', '../Device.private.pem']);

        // well.. find a better way to know the skey size
        files['skey.clean'] = new Buffer(240);

        // TODO: already read.. better use buffer instead
        /*
        rsautl.stdin.write(files['skey']);
        rsautl.stdin.end();
        */

        var fstream = fs.createReadStream('skey');
        fstream.pipe(rsautl.stdin);

        rsautl.stdout.on('data', function(d) {
            d.copy(files['skey.clean']);
        });

        rsautl.stderr.on('data', function(d) { console.warn('rsautl - stderr:' + d);  });

        rsautl.on('exit', function(code) {
            if(code === 0) {
                //console.log('skey.clean hash:' + crypto.createHash('sha1').update(files['skey.clean']).digest('hex'));
                decryptBlob();
            } else {
                cb('rsautl exited with ' + code, null);
            }
        });
    }

    function decryptBlob() {
        console.warn('# Deciphering blob with skey.clean');

        var decipher = crypto.createDecipher('aes-256-cbc', files['skey.clean'].toString());

        var b = ''

        b += decipher.update(files['blob']);
        b += decipher.final();
        
        console.log('blob hash:' + crypto.createHash('sha1').update(files['blob']).digest('hex') )
        console.log('blob.clean hash:' + crypto.createHash('sha1').update(b).digest('hex'));
    
    }

    readFiles(zipf);
}


exports.encANDsend = function(tar, cb) {

};

if(!module.parent) {
    var dir = process.cwd();
    var fname = process.ARGV[2];


    exports.recvANDdec(path.join(dir, fname), function(err, blob) {
        if(err) {
            console.warn('fail:' + err);
            process.exit(1);
        }

        console.warn('Done: ' + blob);

        /*
        var blobClear = fs.createWriteStream(dir + '/blob');

        blob.pipe(blobClear);
        */

    });
}