define(['router', 'SocialNetSockets'], function(router, socket) {
  var initialize = function() {
    socket.initialize(router.socketEvents);
    checkLogin(runApplication);
  };

  var checkLogin = function(callback) {
    $.ajax('/account/authenticated', {
      method: 'GET',
      success: function(data) {
        router.socketEvents.trigger('app:loggedin', data);
        return callback(true);
      },
      error: function(data) {
        return callback(false);
      }
    });
  };

  var runApplication = function(authenticated) {
    if(!authenticated) {
      window.location.hash = 'login';
    } else {
      window.location.hash = 'index';
    }
    Backbone.history.start();
  };

  return {
    initialize: initialize
  };
});
