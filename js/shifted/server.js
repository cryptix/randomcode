(function() {
  // npm modules
  var express    = require('express')
    , Mongoose   = require('mongoose')
    , Schema     = Mongoose.Schema
    , middleware = require('backbone-dnode')
    , DNode      = require('dnode')
    , browserify = require('browserify');

  var app = express.createServer();

  // main config values
  var port = 3000
    , dbpath = 'mongodb://localhost/shifted';

  // browserified js for the client sied
  var bify = browserify({
    require: [
      'dnode'
    , 'backbone-dnode'
    , 'jquery-browserify']
  , mount: '/bify.js'
  });

  // express configuration
  app.configure(function() {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.methodOverride());
    app.use(express.compiler({ src: __dirname + '/public', enable: ['less'] }));
    app.use(bify);
    app.use(express.static(__dirname + '/public'));
    app.use(function(req, res) {
      res.render('layout.jade');
    });
  });

  app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  });

  app.configure('production', function(){
    port = 80;
    app.use(express.errorHandler());
  });

  // database models
  var database = Mongoose.connect(dbpath);

  var dayZero = new Date(2010, 15, 05, 00, 00, 00);

  var ShiftModel = new Schema({
    who: {type: String, index: true},
    day: {type: String, default: 0},
    from: {type: Date, default: dayZero},
    to: {type: Date, default: dayZero}
  });
  database.model('shift', ShiftModel);

  middleware.crud.config(database);

  // fire up
  app.listen(port, function() {
    console.log('Shifted HTTP started on %j', app.address());
  });
  DNode()
    .use(middleware.pubsub)
    .use(middleware.crud)
    .listen(app)
}());
