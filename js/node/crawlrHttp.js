var http = require('http');

var dir = process.ARGV[2];

if(!dir)
	return console.log("Usage: node crawler1.js dirname");

s = http.createServer(function(req, res) {
	res.writeHead(200, {'Content-Type': 'text/plain'});

	var finder = require('findit').find(dir);

	finder.on('directory', function(dir, stat) {
		res.write("Dir:" + dir + " Mtime:" + stat.mtime + "\n");
	});

	finder.on('file', function(file, stat) {
		res.write("File:" + file + " Size:" + stat.size + "\n");
	});

	finder.on('end', function() {
		res.end("Done\n");
	});
}).listen(3000); 
