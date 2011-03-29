var http = require('http');

s = http.createServer(function (req, res) {
		res.writeHead(200, {'Content-Type': 'text/plain'});
		res.end('Hello World\n');
});


s.listen(8124, "127.0.0.1");

console.log('Server running at http://127.0.0.1:8124/');
hi
hi
hi
