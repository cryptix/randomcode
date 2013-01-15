var express = require('express');
var app = express();


function logReq(req, res, next) {
  console.log('[' +req.method +'] ' + req.url);
  next();
}

app.get('/stooges/:name?', logReq, function(req, res, next) {
  var name = req.params.name;

  switch( name ? name.toLowerCase() : '') {
    case 'larry':
    case 'curly':
    case 'moe':
      res.send(name + ' is my favorite stooge.');
      break;
    default:
      next();
  }
});


app.get('/stooges/*?', logReq, function(req, res) {
  res.send('no stooges listed');
});

app.get('/?', logReq, function(req, res) {
  res.send('Hello, World!');
});


var port = 8080;
app.listen(port);
console.log('listening on port ' + port);
