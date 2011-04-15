var dir = process.ARGV[2];

if(!dir)
	return console.log("Usage: node crawlr.js dirname");

// argument handling first
var tree = require('./tree.js');
var finder = require('findit').find(dir);

var treeRoot = new tree.limb('root');

finder.on('directory', function(dir, stat) {
	treeRoot.addChild(dir);
});

finder.on('file', function(file, stat) {
	treeRoot.addLeave(file);
});

finder.on('end', function() {
	console.log("\n\n[crawlr] Done");

	var tmp = treeRoot.getLimb(dir);
	if(tmp) {
		console.dir(tmp);


		console.log("\n\n" + tmp.leaves.length + " leaves  of " + tmp.name);
		tmp.leaves.sort();
		for(var i in tmp.leaves) {
			console.dir(tmp.leaves[i]);
		}

		console.log("\n\n parents  of " + tmp.name);
		for(var i in tmp.childs) {
			console.dir(tmp.childs[i]);
		}
	}
});
