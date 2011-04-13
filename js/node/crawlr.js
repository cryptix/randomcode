var dir = process.ARGV[2];

if(!dir)
	return console.log("Usage: node crawlr.js dirname");

// argument handling first
var tree = require('./tree.js');
var finder = require('findit').find(dir);

var treeRoot = new tree.limb('root');

finder.on('directory', function(dir, stat) {
	//console.log("\n\n[crawlr] Dir:" + dir);
	//console.dir(stat);
	tree.addDirTo(treeRoot, dir);
});

finder.on('file', function(file, stat) {
	//console.log("\n\n[crawlr] File:" + file);
	//console.dir(stat);
	tree.addFileTo(treeRoot, file);
});

finder.on('end', function() {
	console.log("\n\n[crawlr] Done");

	var tmp = tree.getLimb(treeRoot, dir);
	console.dir(tmp);


	console.log("\n\n" + tmp.leaves.length + " leaves  of " + tmp.name);
	tmp.leaves.sort();
	for(var i in tmp.leaves) {
		console.dir(tmp.leaves[i]);
	}

	console.log("\n\n" + tmp.parents.length + " parents  of " + tmp.name);
	for(var i in tmp.parents) {
		console.dir(tmp.parents[i]);
	}
});
