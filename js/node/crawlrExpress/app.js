/**
 * Module dependencies.
 */

var express = require('express'),
    crawlr  = require('../crawlrCB.js');


var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.use(express.logger());
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'keyYyB00ardJUNKK' }));
  app.use(express.compiler({ src: __dirname + '/public', enable: ['less'] }));
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

app.post('/', function(req, res) {
	if(req.body.dir)
		req.session.dir = req.body.dir;
	else
		delete req.session.dir

	res.redirect('back');
});

app.get('/', function(req, res) {
	if(req.session.dir) {
		crawlr.buildTree(req.session.dir, function(tree) {
			res.render('list', {
					current: req.session.dir,
					files: tree.leaves,
					dirs: tree.children
			});
		});
	} else {
		res.render('index');	
	}
});

// Only listen on $ node app.js
if (!module.parent) {
  app.listen(3000);
  console.log("Express server listening on port %d", app.address().port);
}
