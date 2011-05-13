/**
 * Module dependencies.
 */

var express = require('express'),
	crypto  = require('crypto'),
    crawlr  = require('../node/dumpTreeCB.js');

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
		if(err) return '<p class="error">' + err + '</p>';
		if(msg) return '<p class="success">' + msg + '</p>';
	}
});

// app globals
var users = {
	cryptix: {
		name: 'cryptix',
		salt: 'aud12h8asdxzncbsadj129asjdj028192898',
		pass: md5('foobar' + 'aud12h8asdxzncbsadj129asjdj028192898')
	}
};

// helper functions
function md5(str) { return crypto.createHash('md5').update(str).digest('hex'); }


// route helpers
function authenticate(name, pass, fn) {
	var user = users[name];

	if(!user) return fn(new Error('Cannot find user'));

	if(user.pass == md5(pass + user.salt)) return fn(null, user);

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

// Routes
app.get('/', function(req, res) {
	res.redirect('/login');
});

app.get('/login', function(req, res) {
	if(req.session.user) {
		req.session.success = 'Authenticated as ' + req.session.user.name
					+ ' click to <a href="/logout">Logout</a>. '
					+ ' You may now access <a href="/files">/files</a>';
		res.redirect('/files');
	} else res.render('login');
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
			req.session.error = 'Authentication failed, please check your username and password.'
			res.redirect('back');
		}
	});
});

app.get('/logout', function(req, res) {
	req.session.destroy(function(err) {
		res.redirect('/');
	});
});


/* files app logic */
app.get('/files', restrict, function(req, res) {
	var cwd = req.session.cwd;
	if(cwd) {
                dirs = magic.foo(cwd);
                files = magic.foo(cwd);

		res.render('files', {
			user: req.session.user.name,
			cwd: req.session.cwd,
			dirs: dirs,
			files: files
		});
	} else res.render('askDir');
});

app.post('/setCwd', restrict, function(req, res) {
	var cwd = req.body.cwd;
	if(cwd) { // do some checking..???? TODO
		req.session.cwd = cwd;
	} else req.session.destroy(function(err) {
		res.redirect('/');
	});
});

// Ajax calls
/* TODO: Socket.IO
app.get('/ajax/status', ajaxCheckSession, function(req, res) {
	res.send(req.session.current);
});

app.get('/ajax/files', ajaxCheckSession, function(req, res) {
	res.send(trees_by_session_id[req.session.current].leaves);
});

app.get('/ajax/tree', ajaxCheckSession, function(req, res) {
	console.log(req.session.id);
	/* TODO: handle trees globaly
	crawlr.buildTree(req.session.dir, function(tree) {
		res.send(JSON.stringify(tree));
	});
	
});
*/

// Only listen on $ node app.js
if (!module.parent) {
  app.listen(3000);
  console.log("Express server listening on port %d", app.address().port);
}
