var Movie = Backbone.Model.extend({
  validate: function (attrs) {
    if (attrs.title) {
      if (!_.isString(attrs.title) || attrs.title.length === 0) {
        return "Title must be a string with a length > 0";
      }
    }
  }
});
