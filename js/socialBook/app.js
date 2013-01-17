// modules
var fs         = require('fs'),
    express    = require('express'),
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

var models = {
  Account: require('./models/Account')(config, mongoose, nodemailer)
}

app.sessionStore = new MemoryStore();

app.configure(function() {
  app.set('view engine', 'jade');
  app.use(express.static(__dirname + '/public'));
  app.use(express.limit('1mb'));
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({
    secret: "SocialNetf2e7890f0bc82c1f056e",
    key: 'express.id',
    store: app.sessionStore
  }));
  mongoose.connect('mongodb://localhost/nodebackbone');
});

////
// parse routes folder
//
fs.readdirSync('routes').forEach(function(file) {
  if (file[0] == '.') return;
  var routeName = file.substr(0, file.indexOf('.'));
  require(__dirname + '/routes/' + routeName)(app, models);
});

// boot page
app.get('/', function(req, res) {
  res.render('index.jade');
});

// account info
app.get('/accounts/:id', function(req, res) {
  //TODO: refactor auth check
  var accountId = req.params.id == 'me' ? req.session.accountId : req.params.id;
  models.Account.findById(accountId, function(account) {
    if (account == null) res.send(500);
    debugger;
    if (accountId == 'me' || models.Account.hasContact(account, req.session.accountId) ) {
      account.isFriend = true;
    }
    delete account['password'];
    res.send(account);
  });
});

// start listening
app.listen(8080);
console.log('Listening on port 8080');
