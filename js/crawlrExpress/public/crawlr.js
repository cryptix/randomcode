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
		$.post('files/lsDir', 
			{ 'newd': name },
			function(data) {
				$('#tree > ul > li').remove();
				$('#files > table > tbody > tr').remove();
            
				for (var d in data.d) {
					if(data.d.hasOwnProperty(d)) {
						$('#tree > ul').append(TreeElem(d));
					}
				}
            
				for (var f in data.f) {
					if(data.f.hasOwnProperty(f)) {
						$('#files > table > tbody').append(FileRow(f, data.f[f]));
					}
				}
            
				$('#tree > ul').append(TreeElem('..'));
			}, 'json');
	});

	return li;
}

function FileRow(name, stat) {
	var tr = $('<tr></tr>');
	
	tr.append($('<td>' + name + '</td>'));
	tr.append($('<td>' + humansize(stat.size) + '</td>'));
	tr.append($('<td>' + stat.mtime + '</td>'));


	tr.click(function() {
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
	});
	
	return tr;
}

$(document).ready(function() {

	$('.error').hide('slow');
	$('.success').hide('slow');
	
	$('#tree > ul').append(TreeElem('..'));	
	setTimeout(function() {;}, 1000)
});

