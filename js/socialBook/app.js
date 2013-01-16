// modules
var express    = require('express'),
    nodemailer = require('nodemailer'),
    mongoose   = require('mongoose');

var MemoryStore = require('connect').session.MemoryStore;

////
// configuration
//
var config = {
  mail: require('./config/mail')
};

var app = express();

var Account = require('./models/Account')(config, mongoose, nodemailer);

app.configure(function() {
  app.set('view engine', 'jade');
  app.use(express.static(__dirname + '/public'));
  app.use(express.limit('1mb'));
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({secret: "SocialNetf2e7890f0bc82c1f056e", store: new MemoryStore()}));
  mongoose.connect('mongodb://localhost/nodebackbone');
});

////
// routes
//

// boot page
app.get('/', function(req, res) {
  res.render('index.jade');
});
//
//authentication
app.post('/register', function(req, res) {
  var firstName = req.param('firstName', '');
  var lastName  = req.param('lastName', '');
  var email     = req.param('email', null);
  var password  = req.param('password', null);

  if ( null == email || null === password) {
    res.send(400);
    return;
  }

  Account.register(email, password, firstName, lastName);
  //TODO: check .register() callback if user was acctually registerd.
  res.send(200);
});

app.post('/login', function(req, res) {
  console.log('login request');
  var email    = req.param('email', null);
  var password = req.param('password', null);

  if (null == email || email.length < 5 || null == password || password.length < 3) {
    res.send(400);
    return;
  }

  Account.login(email, password, function(account) {
    if( !account ) {
      res.send(401);
      return;
    }
    console.log('login was successful');
    req.session.loggedIn = true;
    req.session.accountId = account._id;
    res.send(200);
  });
});

app.post('/forgotpassword', function(req, res) {
  var hostname = req.headers.host;
  var resetPasswordUrl = 'http://' + hostname + '/resetPassword';
  var email = req.param('email', null);

  if( null == email || email.length < 5) {
    res.send(400);
    return;
  }

  Account.forgotPassword(email, resetPasswordUrl, function(success) {
    if (success) {
      res.send(200);
    } else {
      res.send(404);
    }
  });
});

// pw reset
app.get('/resetPassword', function(req, res) {
  var accountId = req.param('account', null);
  res.render('resetPassword.jade', {locals: {accountId: accountId}});
});

app.post('/resetPassword', function(req, res) {
  var accountId = req.param('account', null);
  var password  = req.param('password', null);

  if (null != accountId && null != password) {
    Account.changePassword(accountId, password);
  }

  res.render('resetPasswordSuccess.jade');
});

// auth check
app.get('/account/authenticated', function(req, res) {
  if (req.session.loggedIn) {
    res.send(200);
  } else {
    res.send(401);
  }
});

// profile pages

app.get('/accounts/:id', function(req, res) {
  //TODO: refactor auth check
  var accountId = req.params.id == 'me' ? req.session.accountId : req.params.id;

  Account.findById(accountId, function(account) {
    delete account['password'];
    res.send(account);
  });
});

// status
app.get('/accounts/:id/status', function(req, res) {
  var accountId = req.params.id == 'me' ? req.session.accountId : req.params.id;

  Account.findById(accountId, function(account) {
    res.send(account.status);
  });
});

app.post('/accounts/:id/status', function(req, res) {
  //TODO: refactor auth check
  var accountId = req.params.id == 'me' ? req.session.accountId : req.params.id;

  Account.findById(accountId, function(acc) {
    var newS = {
      name: acc.name,
    status: req.param('status', '')
    };
    acc.status.push(newS);

    // push the status to all friends
    acc.activity.push(newS);
    acc.save(function(err) {
      if(err) {
        console.log('Error saving account: ' + err);
      }
    });
  });
  res.send(200);
});

app.get('/accounts/:id/activity', function(req, res) {
  var accountId = req.params.id == 'me' ? req.session.accountId : req.params.id;

  Account.findById(accountId, function(acc) {
    res.send(acc.activity);
  });
});

app.listen(8080);
