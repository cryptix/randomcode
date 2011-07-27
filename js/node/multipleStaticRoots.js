
var express = require('express');



var http = express.createServer();
http.configure(function () {
  http.use(express.logger());
  http.use(express.static(__dirname + '/dir1'));
  http.use(express.static(__dirname + '/dir2'));
  http.use(express.static(__dirname + '/dir3'));
});



http.listen(3001);
console.log('listening');
