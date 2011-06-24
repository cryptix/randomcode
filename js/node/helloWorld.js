var http = require('http');

s = http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});

  res.write('Hello\n');

  setTimeout(function() {
    res.write('Node\n');
  }, 2000);

  setTimeout(function() {
    res.end(' World\n');
  }, 4000);
});

s.listen(3000);

console.log('Server running');
