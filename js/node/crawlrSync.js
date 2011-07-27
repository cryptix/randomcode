var dir = process.ARGV[2];

if(!dir)
	return console.log("Usage: node crawlr.js dirname");

// argument handling first
var tree = require('./tree.js');
var found = require('findit').findSync(dir);

var treeRoot = new tree.limb('root');

console.dir(found);

/*
tree.addDirTo(treeRoot, dir);
tree.addFileTo(treeRoot, file);

console.log("\n\n[crawlr] Done");

var tmp = tree.getLimb(treeRoot, dir);
if(tmp) {
	console.dir(tmp);


	console.log("\n\n" + tmp.leaves.length + " leaves  of " + tmp.name);
	tmp.leaves.sort();
	for(var i in tmp.leaves) {
		console.dir(tmp.leaves[i]);
	}

	console.log("\n\n parents  of " + tmp.name);
	for(var i in tmp.parents) {
		console.dir(tmp.parents[i]);
	}
}
*/
