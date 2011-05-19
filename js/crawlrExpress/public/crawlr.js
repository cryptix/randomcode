// helper
var humansize = (function() {
	var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	return function(size) {
		var i = 0;
	    while(size >= 1024) {
	        size /= 1024;
	        ++i;
	    }
		return size.toFixed(1) + ' ' + units[i];
	};
}());

// UI elements
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
	tr.append($('<td>' + humansize(stat.size) + '</td>'));
	tr.append($('<td>' + stat.mtime + '</td>'));


	tr.click(function() {
		now.getFile(name);
	});
	
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

		now.showFile = function(obj) {
			if(obj.b64 !== undefined) {
				var img = $('<img>');
				$('#files > table').hide('slow');
				
				img.attr('src', 'data:'+obj.mime+';base64,'+obj.b64);
				img.css({width:'750px'});
				img.click(function() {
					$(this).remove();
					$('#files > table').show('fast');
				});
				
				$('#files').append(img);
			}
		};
	
		$('#tree > ul').append(TreeElem('..'));	
		setTimeout(function() {now.lsDir('.');}, 1000)
    });
});
