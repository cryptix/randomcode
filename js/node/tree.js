// a single element 
exports.limb = function(dir) {
	this.name = dir;
	this.leaves = new Array();   // ie files
	this.parents = new Object(); // there are no asso arrays in js
}

// add and create parents for path to root
exports.addDirTo = function (root, path) {
	if(typeof(path) == 'string') {
		path = path.split("/");
		path = path.splice(1); // "/abc/def".split('/')[0] == '';
	}

	var newPath = path.slice(); // copy path so we can slice it down

	// get as far as you can
	for(var i in path) {
		var nextRoot = root.parents[path[i]];

		if(nextRoot) {
			root = nextRoot;
			newPath = newPath.slice(1);
		} else break;
	}

	// add the new parent(s) to the last found root
	if(nextRoot) {
		console.log("[tree]  we found the dir?.. ");
	} else {
		//console.log("\n\n[tree] we got as far as:");
		//console.dir(root);
		//console.log("for path[" + path + "]");
		//console.log("new path[" + newPath + "]");

		var newParent = new exports.limb(newPath[0]);
		root.parents[newPath[0]] = newParent;
		if(newPath.length > 1)
			arguments.callee(newParent, newPath.slice(1));

	}
};

// add a file to the corrosponding limb
exports.addFileTo = function (root, path) {
	var tmp = (typeof(path) == 'string') ? path.split('/') : path;
	var path = tmp.slice(1, tmp.length - 1);
	var file = tmp[tmp.length - 1];

	var targetLimb = exports.getLimb(root, path);
	if(targetLimb == undefined) {
		console.log("[tree] unfound limb!!\n[tree] file: " +file+ "path: " + path + "  ]root:");
		console.dir(root);
	} else targetLimb.leaves.push(file);
};

// get final limb element for path
exports.getLimb = function(root, path) {
	if(typeof(path) == 'string') {
		var path = path.split("/");
		path = path.splice(1); // "/abc/def".split('/')[0] == '';
	}

	for(var i in path) {
		var next = root.parents[path[i]];

		if(next) {
			root = next;
		} else break;
	}
	return next;

};
