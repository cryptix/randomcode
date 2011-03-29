var http = require('http'),
	fs = require('fs');

var fname = process.ARGV[2]

s = http.createServer(function (req, res) {
		res.writeHead(200, {'Content-Type': 'text/plain'});

		res.write("hi");
		fs.watchFile(fname, function(curr, prev) {
				res.write('the current mtime is: ' + curr.mtime);
				res.write('the previous mtime was: ' + prev.mtime);
		});

		setTimeout(function() {
			res.end("bye");
		}, 2000);

});


s.listen(8124, "127.0.0.1");

console.log('watching Server running at http://127.0.0.1:8124/');
