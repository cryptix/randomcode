define(['text!templates/status.html'], function(statusTemplate) {
  var registerView = Backbone.View.extend({

    render: function() {
      return _.template(statusTemplate, this.model.toJSON())
    }
  });

  return registerView;
});
