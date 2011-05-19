/**
 * Module dependencies.
 */

var express = require('express'),
	crypto  = require('crypto'),
	path = require('path'),
	nowjs = require('now'),
	daf  = require('../node/dumpDaF.js');

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

// message helper
app.dynamicHelpers({
	message: function(req) {
		var err = req.session.error,
			msg = req.session.success;
		delete req.session.error;
		delete req.session.success;
		if(err) { return '<p class="error">' + err + '</p>'; }
		if(msg) { return '<p class="success">' + msg + '</p>'; }
	}
});

// helper functions
function md5(str) { 
	return crypto.createHash('md5').update(str).digest('hex');
}

// app globals
var users = {
	cryptix: {
		name: 'cryptix',
		salt: 'aud12h8asdxzncbsadj129asjdj028192898',
		pass: md5('foobar' + 'aud12h8asdxzncbsadj129asjdj028192898')
	}
};


// route helpers
function authenticate(name, pass, fn) {
	var user = users[name];

	if(!user) { return fn(new Error('Cannot find user')); }

	if(user.pass === md5(pass + user.salt)) { return fn(null, user); }

	fn(new Error('invalid password'));
}

function restrict(req, res, next) {
	if(req.session.user) {
		next();
	} else {
		req.session.error = 'Access denied!';
		res.redirect('/login');
	}
}

/*
 * Routes
 */
app.get('/', function(req, res) {
	res.redirect('/login');
});

app.get('/login', function(req, res) {
	if(req.session.user) {
		/*
		req.session.success = 'Authenticated as ' + req.session.user.name
					+ ' click to <a href="/logout">Logout</a>. '
					+ ' You may now access <a href="/files">/files</a>';
		*/
		res.redirect('/files');
	} else {
		res.render('login');
	}
});

app.post('/login', function(req, res) {
	authenticate(req.body.user, req.body.pass, function(err, user) {
		if(user) {
			// prevent ' fixation '
			req.session.regenerate(function() {
				req.session.user = user;
				res.redirect('back');
			});
		} else {
			req.session.error = 'Authentication failed, please check your username and password.';
			res.redirect('back');
		}
	});
});

app.get('/logout', function(req, res) {
	req.session.destroy(function(err) {
		res.redirect('/');
	});
});


/*
 * files
 */
app.get('/files', restrict, function(req, res) {
	res.render('files', {
		user: req.session.user.name
	});
});


// Only listen on $ node app.js
if (!module.parent) {
	app.listen(8080, '192.168.1.9');
	console.log("Express server listening on port %d", app.address().port);
}

/*
 * now
 */
var everyone = nowjs.initialize(app);

everyone.connected(function() {
	// initiate
	this.now.cwd = "/Users/cryptix";
    console.dir(this);
// console.log("Setup");
    // console.dir(this);
}); 

everyone.disconnected(function() {
    // console.log("Setdown");
    // console.dir(this);
});

everyone.now.lsDir = function(dir) {
	var newd;
	if(dir === '..') {
		newd = this.now.cwd.split('/').filter(function(e,i,a) { return i < a.length-1; } ).join('/');
	} else {
		newd = path.join(this.now.cwd,dir);
	}
	daf.dirsAndFiles(newd, function(err, files, dirs){
		if(err) { return console.log('no valid dir....' + err); }
		everyone.now.render(files, dirs, newd);
	});
};


everyone.now.getFile = function(fname, cb) {
	daf.getFile(path.join(this.now.cwd, fname), function(err, obj) {
		if(err) { return console.log('file error' + err); }
		everyone.now.showFile(obj);
	});
};