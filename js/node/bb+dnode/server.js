// modules
var express    = require('express')
  , dnode      = require('dnode')
  , middleware = require('backbone-dnode')
  , browserify = require('browserify');


var server = express.createServer();

server.use(express.static(__dirname + '/public'));

var bundle = browserify({
  require: [
    'dnode',
    'backbone-dnode',
    'jquery-browserify'
  ],
  mount: '/core.js'
});

server.use(bundle);


var Mongoose = require('mongoose')
  , Schema   = Mongoose.Schema
  , ObjectId = Schema.ObjectId;

var database = Mongoose.connect('mongodb://localhost/bbTest');

var Foo = new Schema({
  bar     : { type: String, index: true},
  created : { type: Date, default: Date.now }
});

middleware.crud.config(database);

server.listen(3000, '127.0.0.1', function() {
  console.log('Express is listening');
});
