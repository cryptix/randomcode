/*
 * 
 */
var Seq = require('seq'),
	Hash = require('hashish'),
	mime = require('mime'),
    path = require('path'),
    fs = require('fs');

// looks into a dir and splits the content into directories and files + stats
exports.dirsAndFiles = function(dir, cb) {
	Seq()
		.seq(function() {
			fs.readdir(dir, this);
		})
		.flatten()
		.parEach(function(file, index) {
			fs.lstat(path.join(dir,file), this.into(file));
		})
		.catch(function (err) {
			err.dir = dir;
			console.error(err.stack ? err.stack : err)
			cb(err, null, null);
		})
		.seq(function() {
			var files = Hash.filter(this.vars, function(item) {return !item.isDirectory()});
			var dirs  = Hash.filter(this.vars, function(item) {return item.isDirectory()});
			cb(null, files, dirs);
		});
};

// lets see
exports.getFile = function(path, cb) {
	var obj = {
		path: path,
		mime: mime.lookup(path)
	};
	fs.readFile(path, function(err, buf) {
		if (err) cb(err, null);
		switch (obj.mime) {
			case 'image/jpeg':
			case 'image/png':
				obj.b64 = buf.toString('base64');
				break;
			case 'application/octet-stream':
				obj.str = buf.toString('utf8');
				break;
		}
		cb(null, obj);
	});
};

if(!module.parent) {
	var dir = process.ARGV[2];

	if(!dir) return console.log("Usage: node " + process.ARGV[1] + " dirname");
	
	exports.dump(dir, function(err, files, dirs) {
		console.log("Done!\n\nFiles:");
	    console.dir(files);

	    console.log("\n\nDirs:");
		for(var d in dirs) {
			if(dirs.hasOwnProperty(d)) {
				console.log(d);
			}
		}
	    console.dir(dirs);
	});
};