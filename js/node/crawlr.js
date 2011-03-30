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
