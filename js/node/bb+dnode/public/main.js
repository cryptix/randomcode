var dnode = require('dnode');
var middleware =  require('backbone-dnode');
var $ = require('jquery-browserify');


var Foo = Backbone.Model.extend({
  type: 'foo',
  sync: _.sync
});

var FooCollection = Backbone.Collection.extend({
  url   : 'foos',
  type  : 'foo',
  sync  : _.sync,
  model : Foo
});

Backbone.sync = _.sync;

var foos = null;
$(document).ready(function() {
  dnode()
    .use(middleware.crud)
    .use(middleware.pubsub)
    .connect(function(remote) {
      var options = {};

      console.log('dnode connected');

      foos = new FooCollection();

      foos.subscribe(options, function() {
        foos.fetch({
          finished: function(data) {
            console.log('fetch finished');
            // server responded with the fetched data,
            // and has added to the collection.
          }
        })
      });
    });
});
