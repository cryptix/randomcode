#!/usr/bin/env node

var connect = require('connect'),
	port = 3000,
	path = process.cwd();

connect()
  .use(connect.logger('dev'))
  // .use(connect.logger(':status - :method :url'))
  .use(connect.static(path))
  .listen(port);

console.log('Listening at [%s] on port %d', path, port);

