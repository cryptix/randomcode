var connect = require('connect');
var server = connect.createServer();

server.use(connect.static(__dirname));
server.use(require('browserify')({
    require: __dirname + '/js/foo.js',
    mount: '/browserify.js'
}));

server.listen(3001);
console.log('Listening on %j', server.address());
