var dnode = require('dnode');
var middleware =  require('backbone-dnode');
var $ = require('jquery-browserify');


var foos = null;
$(document).ready(function() {
  var Foo = Backbone.Model.extend({
    url   : 'foos',
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
            //console.dir(data);
            // server responded with the fetched data,
            // and has added to the collection.
          },
            error: function(code) {
              console.log('ERROR!!');
              console.dir(code);
            }
        })
      });

      foos.bind('add', function(foo) {
          console.dir(foo);
      });
      foos.bind('reset', function() {
        foos.each(function(foo) { console.log(foo.get('id'), foo.get('bar')) });
      });
    });

  $('#get').click(function() {
    console.dir(foos.fetch({add: true}))
  });

  $('#send').click(function() {
    var txt = $('#myInput').val();
    if(txt.length != 0) {
      var mine = new Foo({bar: txt});
      console.dir(mine);
      foos.create(mine);
    }
  });
});
