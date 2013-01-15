var express = require('express')
  , http    = require('http');


var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);

var catchPhrases = ['Why I oughta....', 'Nyuk Nyuk Nyuk!', 'Poifect!', 'Spread out!', 'Say a few syllables!', 'Soitenly!', 'more random trash'];

app.set('view engine', 'jade');
app.set('view options', { layout: true});
app.set('views', __dirname + '/views');

function logReq(req, res, next) {
  console.log('[' +req.method +'] ' + req.url);
  next();
}


app.get('/stooges/:name?', logReq, function(req, res, next) {
  res.render('chat');
});

io.sockets.on('connection', function(socket) {
  var sendChat = function(title, text) {
    socket.emit('chat', {
      title: title,
      contents: text
    });
  };
  setInterval(function() {
    var randomIndex = Math.floor(Math.random()*catchPhrases.length);
    sendChat('Stooge', catchPhrases[randomIndex]);
  }, 5000);

  sendChat('Welcome to Stooge Chat', 'The Stooges are on the line');
  socket.on('chat', function(data) {
    sendChat('You', data.text);
  });
});

app.get('/?', function(req, res) {
  res.render('index');
});




var port = 8080;
server.listen(port);
console.log('listening on port ' + port);
