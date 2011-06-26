(function() {
  var server = false, models;
  //commonJS
  if (typeof exports !== 'undefined') {
    _ = require('underscore')._;
    Backbone = require('backbone');

    models = exports;
    server = true;
  } else {
    models = this.models = {};
  }

  models.Todo = Backbone.Model.extend({
    defaults: {
      'priority': 3
    },
    validate: function(attrs) {
      if(!attrs.title || attrs.title.length === 0) {
        return 'cannot have an empty title';
      }
    }
  });

  models.Todos = Backbone.Collection.extend({
    model: models.Todo,
    comparator: function(todo) {
      return todo.get('priority');
    }
  });
})();
