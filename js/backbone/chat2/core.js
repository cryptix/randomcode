// deps
var _ = require('underscore')._,
    Backbone = require('backbone');

// our models
var models = require('./models/models.js'),
    auth = require('./lib/auth.js');

// redis
var redis = require('redis'),
    rc = redis.createClient();

rc.on('error', function (err) {
  console.log('Error ' + err);
});

var express = require('express'),
    app = express.createServer(),
    jade = require('jade'),
    socket = require('socket.io').listen(app),
    RedisStore = require('connect-redis');

app.set('view engine', 'jade');
app.set('view options', {layout: false});
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ store: new RedisStore(), secret: 'I loooveee PooOOonniiieees' }));

app.get('/*.(js|css)', function (req, res) {
  res.sendfile('./' + req.url);
});

app.get('/login', function (req, res) {
  res.render('login');
});

app.post('/login', function (req, res) {
  auth.authenticateUser(req.body.username, req.body.password, function (err, user) {
    if (user) {
      req.session.regenerate(function () {
        req.session.cookie.maxAge = 24 * 60 * 60; // one day cookie
        req.session.cookie.httpOnly = false;
        req.session.user = user;

        res.redirect('/');
      });
    } else {
      req.session.error = 'Authentication failed, please check your username and password.';
      res.redirect('back');
    }
  });
});

app.get('/signup', function (req, res) {
  res.render('signup');
});

app.post('/signup', function (req, res) {
  auth.createNewUserAccount(req.body.username, req.body.password1, req.body.password2, req.body.email, req.body.ponies, 
    function (err, user) {
    if ((err) || (!user)) {
      req.session.error = 'New user failed, please check your username and password.';
      res.redirect('back');
    } else if (user) {
      res.redirect('/login');
    }
  });
});

app.get('/logout', function (req, res) {
  req.session.destroy(function () {
    res.redirect('home');
  });
});

function restrictAccess (req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }
}

app.get('/', restrictAccess, function (req, res) {
  res.render('index', {
    locals: {
      name: req.session.user.name,
      hashPass: JSON.stringify(req.session.user.hashPass)
    }
  });
});


var activeClients = 0;
var nodeChatModel = new models.AppChatModel();

function disconectAndRedirectClient(client, fn) {
  console.log('Disconnecting unauthenticated user');
  client.send({ event: 'disconnect' });
  client.connection.end();
  fn();
  return;
}

socket.on('connection', function (client) {
  client.connectSession = function(fn) {
    if (!client.request || !client.request.headers || !client.request.headers.cookie) {
      disconectAndRedirectClient(client, function() {
        console.log('Null request/header/cookie!');
      });
      return;
    }

    console.log('Cookie is ' + client.request.headers.cookie);

    var match, sid;

    match = client.request.headers.cookie.match(/connect\.sid=([^;]+)/);
    if (!match || match.length < 2) {
      disconectAndRedirectClient(client, function() {
        console.log('Failed to find connect.sid in cookie');
      });
      return;
    }

    sid = unescape(match[1]);

    rc.get(sid, function (err, data) {
      fn(err, JSON.parse(data));
    });
  };

  client.connectSession(function(err, data) {
      if(err) {
        console.log('Error on connectSession: ' + err);
        return;
      }

      client.user = data.user;

      activeClients += 1;
      client.on('disconect', function () {
        activeClients -= 1;
        client.broadcast({clients: activeClients});
      });

      client.on('message', function (msg) {
        var chat = new models.ChatEntry();
        chat.mport(msg);

        rc.incr('next.chatentry.id', function (err, newId) {
          chat.set({id: newId});
          nodeChatModel.chats.add(chat);

          var expandedMsg = chat.get('id') + ' ' + client.user.name + ': ' + chat.get('text');
          console.log('(' + client.sessionId + ') ' + expandedMsg);

          rc.rpush('chatentries', chat.xport(), redis.print);

          socket.broadcast({
            event: 'chat',
            data: chat.xport()
          });
        });
      });

      console.log('User successfully connected with ' + data.user.name + ' hash ' + data.user.hashPass);

      socket.broadcast({
        event: 'update',
        cleints: activeClients
      });

      var ponyWelcome = new models.ChatEntry({name: 'PonyBot', text: 'Hello ' + data.user.name + '. I also feel that ponoes ' + data.user.ponies + '. Welcome to nodechat'});

      socket.broadcast({
        event: 'chat',
        data: ponyWelcome.xport()
      });
    });
});

app.listen(8000,'192.168.1.9');
