function setCurrentDir() {
	dojo.xhrGet({
		url: "ajax/status",
		load: function(result) {
			dojo.byId("current").value = result;
		}
	});
}

function updateFiles() {
	dojo.xhrGet({
		url: "ajax/files",
		handleAs: "json",
		load: function(result) {
			var ftable = dojo.query("#files table")[0];
				
			dojo.forEach(result, function(item, index) {
				var tr = dojo.create("tr", {}, ftable);

				dojo.create("td", {innerHTML: item.name}, tr);
				dojo.create("td", {innerHTML: item.size}, tr);
				dojo.create("td", {innerHTML: item.mtime}, tr);
			});
		}
	});
}

function setupUI() {
	var change = dojo.byId("change"),
		refresh = dojo.byId("refresh");
	
	// bind events
	dojo.connect(change, "onclick", function(evt) {
		dojo.xhrPost({
			url: "setDir",
			form: dojo.byId("currentForm"),
			error: function(msg) {
				alert("Error:"+msg);
				// TODO: handle error
			},
		}); // TODO: send new directory to list
	});

	dojo.connect(refresh, "onclick", setCurrentDir );

	// pull initial data
	//setCurrentDir();

}


dojo.ready(function() {
});
