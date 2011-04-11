// a single element 
exports.limb = function(dir) {
	this.name = dir;
	this.leaves = [];	// ie files
	this.parents = [];
}

exports.addDirTo = function (elem, path) {
	if(typeof(path) == 'string') path = path.split('/');
	var first = path[0];
	var rest = path.splice(1);

	//console.log("[tree] addDirTo called with elem:");
	//console.dir(elem);
	//console.log("[tree] first: " + first + " and rest:");
	//console.dir(rest);


	if(elem.name == first) {
		arguments.callee(elem, rest);
	} else {
		var nextRoot = elem.parents[first];
		if(nextRoot) {
			//console.log("[tree] has nextRoot:");
			//console.dir(nextRoot);
			arguments.callee(nextRoot, rest);
		} else {
			var newParent = new exports.limb(first);
			elem.parents[newParent.name] = newParent;
			if(rest.length > 0)
				arguments.callee(newParent, rest);

			//console.log("[tree] adding nextRoot: ");
			//console.dir(newParent);
			//console.log("to: ");
			//console.dir(elem);
		}
	}
};
