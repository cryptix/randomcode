// a single element 
exports.limb = function(dir) {
	this.name = dir;
	this.leaves = [];	// ie files
	this.parents = [];
}

// add and create parents for path to root
exports.addDirTo = function (root, path) {
	if(typeof(path) == 'string') path = path.split('/');
	var first = path[0];
	var rest = path.splice(1);

	if(root.name == first || first == '') {
		arguments.callee(root, rest);
	} else {
		var nextRoot = root.parents[first];
		if(nextRoot) {
			arguments.callee(nextRoot, rest);
		} else {
			console.log("[tree] adding new limb: " + first + " to:");
			console.dir(root);

			var newParent = new exports.limb(first);
			root.parents[newParent.name] = newParent;
			if(rest.length > 0)
				arguments.callee(newParent, rest);
			if(rest.length == 0) {
				return newParent;
			}
		}
	}
};

// add a file to the corrosponding limb
exports.addFileTo = function (root, path) {
	var tmp = (typeof(path) == 'string') ? path.split('/') : path;
	var path = tmp.slice(1, tmp.length - 1);
	var file = tmp[tmp.length - 1];

	var targetLimb = exports.getLimb(root, path);
	if(targetLimb == undefined) {
		console.log("[tree] file: " +file+ "path: " + path + "  ]root:");
		console.dir(root);
	} else targetLimb.leaves.push(file);
};

// get final limb element for path
exports.getLimb = function(root, path) {
	if(typeof(path) == 'string') {
		var path = path.split("/");
		path = path.splice(1); // "/abc/def".split('/')[0] == '';... :(
	}

	for(var i in path) {
		var next = root.parents[path[i]];

		if(next) {
			root = next;
		} else break;
	}
	return next;

};
