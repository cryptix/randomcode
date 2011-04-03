function limb(dir) {
	this.name = dir;
	this.leaves = [];	// ie files
	this.crot = [];	// ie parent dirs
	this.in = function(elem) {
		var len = crot.length();
		for(var i = 0; i < len; i++) {
			if ( elem == crot[i] )
				return crot[i];
		}
		return false;
	}
}


function treeRoot(limb, path) {
	var parts = path.split('/');
	var plen = parts.length();
	for(i=0; i < plen; i++) {
	}
}


var treeRoot = new limb('root');


var dir = process.ARGV[2];

if(!dir)
	return console.log("Usage: node crawler1.js dirname");

var finder = require('findit').find(dir);

finder.on('directory', function(dir, stat) {
	console.log("Dir:" + dir + " Stat:");
	console.dir(stat);
});

finder.on('file', function(file, stat) {
	console.log("File:" + file + " Stat");
	console.dir(stat);
});

finder.on('end', function() {
	console.log("Done");
});
