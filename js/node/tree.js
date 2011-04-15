// a single element 
exports.limb = function(name, parent) {
	this.name = name;
	this.parent = parent ? parent : undefined;

	// Leaves
	this.leaves = []; // ie files
	this.addLeave = function (path, stat) {
		var tmp = (typeof(path) == 'string') ? path.split('/') : path;

		var path = tmp.slice(1, tmp.length - 1);
		var file = tmp[tmp.length - 1];

		var targetLimb = this.getLimb(path);
		if(targetLimb == undefined) {
			console.log("[tree] unfound limb!!\n[tree] file: " +file+ "path: " + path + "  ]root:");
			console.dir(root);
		} else {
			file = (!stat) ? file : {
					name: file,
					size: stat.size,
					mtime: stat.mtime
				};

			targetLimb.leaves.push(file);
		}
	};

	// Children
	this.children = {}; // there are no asso arrays in js
	this.addChild = function (path) {
		if(typeof(path) == 'string') {
			path = path.split("/");
			path = path.splice(1); // "/abc/def".split('/')[0] == '';
		}

		var root = this;
		var newPath = path.slice(); // copy path so we can slice it down

		// get as far as you can
		for(var i in path) {
			var nextRoot = root.children[path[i]];

			if(nextRoot) {
				root = nextRoot;
				newPath = newPath.slice(1);
			} else break;
		}

		// add the new child to the last found root
		if(nextRoot) {
			console.log("[tree]  we found the dir?.. ");
			console.log("\tpath:" + path);
		} else {
			var newParent = new exports.limb(newPath[0], root);
			root.children[newPath[0]] = newParent;
			if(newPath.length > 1) // go on if you have more to add
				newParent.addChild(newPath.slice(1));
		}
	};

	// Tools
	this.getLimb = function(path) {
		if(typeof(path) == 'string') {
			path = path.split("/");
			path = path.splice(1); // "/abc/def".split('/')[0] == '';
		}
		var root = this;

		for(var i in path) {
			var next = root.children[path[i]];

			if(next) {
				root = next;
			} else break;
		}
		return next;
	};
}
