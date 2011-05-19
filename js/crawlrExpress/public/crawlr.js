function TreeElem(name) {
	var li = $('<li>'+name+'</li>');
	li.click(function() {
        now.lsDir(name);
    });

	return li;
}

function FileRow(name, stat) {
	var tr = $('<tr></tr>');
	
	tr.append($('<td>' + name + '</td>'));
	tr.append($('<td>' + stat.size + '</td>'));
	tr.append($('<td>' + stat.mtime + '</td>'));

	return tr;
}


    // now
now.ready(function() {
	$(document).ready(function() {
        now.render = function(files, dirs, newd) {
			$('#cwd')[0].value = now.cwd = newd;
			$('#tree > ul > li').remove();
			$('#files > table > tbody > tr').remove();
			
			$('#tree > ul').append(TreeElem('..'));
			for (var d in dirs) {
				if(dirs.hasOwnProperty(d)) {
					$('#tree > ul').append(TreeElem(d));
				}
			}
			
			for (var f in files) {
				if(files.hasOwnProperty(f)) {
					$('#files > table > tbody').append(FileRow(f, files[f]));
				}
			}
			
        };
	
		$('#tree > ul').append(TreeElem('..'));	
		setTimeout(function() {now.lsDir('.');}, 1000)
    });
});
