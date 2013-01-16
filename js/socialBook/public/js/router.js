define(['views/index', 'views/register', 'views/login', 'views/forgotpassword',
    'views/profile', 'models/Account', 'models/StatusCollection'],
function(indexView, registerView, loginView, forgotPasswordView, profileView, Account, StatusCollection) {
  var SocialRouter = Backbone.Router.extend({
    currentView: null,

    routes: {
      'index': 'index',
      'login': 'login',
      'register': 'register',
      'forgotpassword': 'forgotpassword',
      'profile/:id': 'profile'
    },

    changeView: function(view) {
      if (this.currentView != null) {
        this.currentView.undelegateEvents();
      }
      this.currentView = view;
      this.currentView.render();
    },

    index: function() {
      var statusCollection = new StatusCollection();
      statusCollection.url = '/accounts/me/activity';
      this.changeView(new indexView({
        collection: statusCollection
      }));
      statusCollection.fetch();
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

    profile: function(id) {
      var model = new Account({id: id});
      this.changeView(new profileView({model: model}));
      model.fetch();
    }
  });

  return new SocialRouter();
});
