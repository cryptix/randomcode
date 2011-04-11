var tree = require('./tree.js');


var treeRoot = new tree.limb('root');


var dir = process.ARGV[2];

if(!dir)
	return console.log("Usage: node crawler1.js dirname");

var finder = require('findit').find(dir);

finder.on('directory', function(dir, stat) {
	//console.log("\n\n[crawlr] Dir:" + dir);
	//console.dir(stat);
	tree.addDirTo(treeRoot, dir);
});

/* no files right now
finder.on('file', function(file, stat) {
	console.log("File:" + file + " Stat");
	console.dir(stat);
});

*/

finder.on('end', function() {
	console.log("\n\n[crawlr] Done");

	var tmp = treeRoot.parents[""].parents["home"].parents["cryptix"];
	console.dir(tmp);
	for(var i in tmp.parents) {
		console.dir(tmp.parents[i]);
	}
});
