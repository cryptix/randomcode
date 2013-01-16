define(['views/index', 'views/register', 'views/login', 'views/forgotpassword'], function(indexView, registerView, loginView, forgotPasswordView) {
  var SocialRouter = Backbone.Router.extend({
    currentView: null,

    routes: {
      'index': 'index',
      'login': 'login',
      'register': 'register',
      'forgotpassword': 'forgotpassword'
    },

    changeView: function(view) {
      if (this.currentView != null) {
        this.currentView.undelegateEvents();
      }
      this.currentView = view;
      this.currentView.render();
    },

    index: function() {
      this.changeView(new indexView());
    },

    login: function() {
      this.changeView(new loginView());
    },

    register: function() {
      this.changeView(new registerView());
    },

    forgotpassword: function() {
      this.changeView(new forgotpasswordView());
    },
  });

  return new SocialRouter();
});
