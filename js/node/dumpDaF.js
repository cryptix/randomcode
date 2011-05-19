/*
 * looks into a dir and splits the content into directories and files + stats
 */
var Seq = require('seq'),
	Hash = require('hashish'),
    path = require('path'),
    fs = require('fs');

exports.dump = function(dir, cb) {
	Seq()
		.seq(function() {
			fs.readdir(dir, this);
		})
		.catch(function (err) {
			err.dir = dir;
			throw err;
		})
		.flatten()
		.parEach(function(file, index) {
			fs.lstat(path.join(dir,file), this.into(file));
		})
		.seq(function() {
			var files = Hash.filter(this.vars, function(item) {return !item.isDirectory()});
			var dirs  = Hash.filter(this.vars, function(item) {return item.isDirectory()});
			cb(null, files, dirs);
		})
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