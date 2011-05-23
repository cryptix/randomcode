
/**
 * Module dependencies.
 */

var express = require('express'),
    nowjs = require('now');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'your secret here' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', function(req, res){
  res.render('index', {
    title: 'nowBlip'
  });
});

app.listen(8080, '192.168.1.9');



// Now
var everyone = nowjs.initialize(app);

everyone.connected(function() {
    console.log("Setup");

    console.dir(this);
}); // Setup

everyone.disconnected(function() {
    console.log("Setdown");

    console.dir(this);
}); // Setdown

everyone.now.distributeMsg = function(message) {
  everyone.now.getMsg(this.now.name, message);
};


console.log("Express server listening on port %d", app.address().port);
