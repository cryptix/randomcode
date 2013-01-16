define(['text!templates/register.html'], function(registerTemplate) {
  var registerView = Backbone.View.extend({
    el:$('#content'),

    events: {
      'submit form': 'register'
    },

    register: function() {
      //TODO: confirm user input before post.
      $.post('/register', {
        firstName: $('input[name=firstName]').val(),
        lastName: $('input[name=lastName]').val(),
        email: $('input[name=email]').val(),
        password: $('input[name=password]').val(),
      }, function(data) {
        //TODO: check response for errors (e.g. user exists, bad data)
        console.log(data);
      });
      return false;
    },

    render: function() {
      this.$el.html(registerTemplate);
    }
  });

  return registerView;
});
