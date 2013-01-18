// modules
var fs         = require('fs'),
    http       = require('http'),
    events     = require('events'),
    express    = require('express'),
    nodemailer = require('nodemailer'),
    mongoose   = require('mongoose');

var MemoryStore = require('connect').session.MemoryStore;

var app = express();
app.server = http.createServer(app);


// create event dispatcher
var eventDispatcher = new events.EventEmitter();
app.addEventListener = function(eventName, cb) {
  eventDispatcher.on(eventName, cb);
};
app.removeEventListener = function(eventName, cb) {
  eventDispatcher.removeListener(eventName, cb);
};
app.triggerEvent = function(eventName, eventOptions) {
  eventDispatcher.emit(eventName, eventOptions);
};
//
// configuration
var dbPath = 'mongodb://localhost/nodebackbone';

var config = {
  mail: require('./config/mail')
};

var models = {
  Account: require('./models/Account')(app, config, mongoose, nodemailer)
};

app.configure(function() {
  app.set('view engine', 'jade');
  app.use(express.static(__dirname + '/public'));
  app.use(express.limit('1mb'));
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.sessionStore = new MemoryStore();
  app.sessionSecret = 'SocialNetf2e7890f0bc82c1f056e';
  app.use(express.session({
    secret: app.sessionSecret,
    key: 'express.sid',
    store: app.sessionStore
  }));
  mongoose.connect(dbPath, function onErr(err) {
    if(err) throw err;
  });
});

// boot page
app.get('/', function(req, res) {
  res.render('index.jade');
});

// parse routes folder
fs.readdirSync('routes').forEach(function(file) {
  if (file[0] == '.') return;
  var routeName = file.substr(0, file.indexOf('.'));
  require(__dirname + '/routes/' + routeName)(app, models);
});

// start listening
app.server.listen(8080);
console.log('Listening on port 8080');
