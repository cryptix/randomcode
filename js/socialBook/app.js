// modules
var express    = require('express'),
    nodemailer = require('nodemailer'),
    mongoose   = require('mongoose');

var app = express();
var MemoryStore = require('connect').session.MemoryStore;

////
// configuration
//
var config = {
  mail: require('./config/mail')
};

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

  if (null == email || email.length < 5 || null == password || password.length < 3) {
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

// profile page
app.get('/accounts/:id', function(req, res) {
  //TODO: refactor auth check
  var accountId = req.params.id == 'me' ? req.session.accountId : req.params.id;
  Account.findById(accountId, function(account) {
    if (accountId == 'me' || Account.hasContact(account, req.session.accountId) ) {
      account.isFriend = true;
    }
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
  //TODO: escape status text to clear xss
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

// contacts
app.get('/accounts/:id/contacts', function(req, res) {
  var accountId = req.params.id == 'me' ? req.session.accountId : req.params.id;

  Account.findById(accountId, function(acc) {
    res.send(acc.contacts);
  });
});

app.post('/accounts/:id/contact', function(req, res) {
  var accountId = req.params.id == 'me' ? req.session.accountId : req.params.id;
  var contactId = req.param('contactId', null);

  if (null == contactId || contactId.length < 1) {
    res.send(400);
    return;
  }

  Account.findById(accountId, function(acc) {
    if (acc) {
      Account.findById(contactId, function(cont) {
        Account.addContact(acc, cont);

        // reverse Link
        Account.addContact(cont, acc);
        //acc.save();
      });
    }
  });

  // returns immediatly and processes in background
  res.send(200);
});

app.delete('/accounts/:id/contact', function(req, res) {
  var accountId = req.params.id == 'me' ? req.session.accountId : req.params.id;
  var contactId = req.param('contactId', null);

  if (null == contactId) {
    res.send(400);
    return;
  }

  Account.findById(accountId, function(acc) {
    if(!acc) return;
    Account.findById(contactId, function(cont, err) {
      if (!cont) return;

      Account.removeContact(acc, contactId);
      Account.removeContact(cont, accountId);
    });
  });

  // returns immediatly and processes in background
  res.send(200);
});

app.post('/contacts/find', function(req, res) {
  // TODO: auth check
  var searchStr = req.param('searchStr', null);
  if (null == searchStr || searchStr.length < 1) {
    res.send(400);
    return;
  }

  Account.findByString(searchStr, function onSearchDone(err, accounts) {
    if(err || accounts.length == 0) {
      res.send(404);
    } else {
      res.send(accounts);
    }
  });
});


// start listening
app.listen(8080);
console.log('Listening on port 8080');
