var tree = require('./tree.js'),
	fs = require('fs');

exports.buildTree = function (path, next) {
	var treeRoot = new tree.limb('root');
	treeRoot.path = path;

	var files = findSync(path);
	var len = files.length;
	files.forEach(function (file) {
		fs.stat(file, function(err, stat) {
			if(err) throw err
			len--;
			if(stat.isFile()) {
				treeRoot.addLeave(file, stat);
			} else if(stat.isDirectory()) {
				treeRoot.addChild(file);
			}

			if(len <= 0) next(treeRoot.getLimb(path));
		});
	});
}

if (!module.parent) {
	var dir = process.ARGV[2];

	if(!dir)
		return console.log("Usage: node crawlr.js dirname");

	exports.buildTree(dir, function(tree) {
		console.log("\n\n[crawlr] Done");

		console.log("\n\n" + tree.leaves.length + " leaves  of " + tree.name);
		tree.leaves.sort();
		for(var i in tree.leaves) {
			console.dir(tree.leaves[i]);
		}

		console.log("\n\n parents  of " + tree.name);
		for(var i in tree.childs) {
			console.dir(tree.childs[i]);
		}
	});
}
