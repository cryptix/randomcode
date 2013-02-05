var express  = require('express'),
    http     = require('http'),
    jade     = require('jade'),
    sio      = require('socket.io'),
    _        = require('underscore')._,
    Backbone = require('backbone'),
    redis    = require('redis'),
    rc       = redis.createClient(),
    models   = require('./models/models.js');

var app = express();
app.server = http.createServer(app);




// app.get('/*.(js|css)', function(req, res) {
//   res.sendfile('./' + req.url);
// });

app.configure(function() {
  app.set('view engine', 'jade');
  app.set('view options', {layout: false});
  app.use(express.static(__dirname));
});

app.get('/', function(req, res) {
  res.render('index');
});

var activeClients = 0;
var nodeChatModel = new models.AppChatModel();

rc.lrange('chatentries', -10, -1, function (err, data) {
  if (data) {
    _.each(data, function(jsonChat) {
      var chat = new models.ChatEntry();
      chat.mport(jsonChat);
      nodeChatModel.chats.add(chat);
    });

    console.log('Revived', nodeChatModel.chats.length, 'chats');
  } else {
    console.log('No data returned for key');
  }
});

var socket = sio.listen(app.server);
socket.on('connection', function(client) {
  activeClients += 1;

  client.on('disconect', function () {
    activeClients -= 1;
    client.broadcast({clients: activeClients});
  });

  client.on('message', function(msg) {
    var chat = new models.ChatEntry();
    chat.mport(msg);
    
    rc.incr('next.chatentry.id', function(err, newId) {
      chat.set({id: newId});
      nodeChatModel.chats.add(chat);

      console.log('(', client.sessionId, ')', chat.get('id'), ' ', chat.get('name'), ': ', chat.get('text'));

      rc.rpush('chatentries', chat.xport(), redis.print);
      rc.bgsave();

      socket.broadcast({
        event: 'chat',
        data: chat.xport()
      });
    });
  });

  client.send({
    event: 'initial',
    data: nodeChatModel.xport()
  });

  socket.broadcast({
    event: 'update',
    clients: activeClients
  });
});

app.server.listen(8000);
console.log('Server Listening');
