/**
 * Module dependencies.
 */

var express = require('express'),
    findit  = require('findit');


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
		var finder = findit.find(req.session.dir);
		var dirs = [];
		var files = [];

		finder.on('directory', function(dir) {
			dirs.push(dir);
		});

		finder.on('file', function(file, stat) {
			var entry = { name: file,
				      size: stat.size,
				      mtime: stat.mtime,
				    };
			files.push(entry);
		});

		finder.on('error', function(err) {
			delete req.session.dir;
			res.render('index', {err: err});
		});

		finder.on('end', function() {
			res.render('list', {
					current: req.session.dir,
					files: files,
					dirs: dirs
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
