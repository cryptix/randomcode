var fs = require('fs'),
	join = require('path').join;

function read_directory(path, next) {
	fs.readdir(path, function (err, files) {
		var count = files.length,
			results = {};

		files.forEach(function (filename) {
			fs.readFile(join(path,filename), 'utf8', function(err, data) {
				count--;

				if (!err) results[filename] = data;
				if (count <= 0) next(results);
			});
		});
	});
}

function read_directories(paths, next) {
	var count = paths.length,
		data = {};

	paths.forEach(function (path) {
		read_directory(path, function(result) {
			data[path] = result;
			count--;
			if (count <= 0) {
				next(data);
			}
		});
	});
}

read_directories(['testtree', 'crawlrExpress'], function(data) {
	console.dir(data);
});
