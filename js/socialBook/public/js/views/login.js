define(['text!templates/login.html'], function(loginTemplate) {
  var loginView = Backbone.View.extend({
    el: $('#content'),

    events: {
      "submit form": "login"
    },

    initialize: function(opts) {
      this.socketEvents = opts.socketEvents;
    },

    login: function() {
      var sockEvents = this.socketEvents;
      $.post('/login',
        this.$('form').serialize(), function(data) {
          sockEvents.trigger('app:loggedin');
          window.location.hash = '#index'
      }).error(function() {
        $('#error').text('Unable to login.');
        $('#error').slideDown();
      });
      return false;
    },

    render: function() {
      this.$el.html(loginTemplate);
    }
  });

  return loginView;
});
