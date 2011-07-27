var connect = require('connect');
var server = connect.createServer();

server.use(connect.static(__dirname));
server.use(require('browserify')({
    mount: '/browserify.js',
    require: ['traverse', 'spine', 'jquery-browserify']
}));

server.listen(3002);
console.log('Listening on %j', server.address());
