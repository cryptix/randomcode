define(['views/index', 'views/register', 'views/login', 'views/forgotpassword',
    'views/profile', 'views/contacts', 'views/addcontact',
    'models/Account', 'models/StatusCollection', 'models/ContactCollection'],
function(indexView, registerView, loginView, forgotPasswordView,
  profileView, contactsView, addContactView,
  Account, StatusCollection, ContactCollection)
{
  var SocialRouter = Backbone.Router.extend({
    currentView: null,

    socketEvents: _.extend({}, Backbone.Events),

    routes: {
      'addcontact': 'addcontact',
      'index': 'index',
      'login': 'login',
      'register': 'register',
      'forgotpassword': 'forgotpassword',
      'profile/:id': 'profile',
      'contacts/:id': 'contacts'
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
        collection: statusCollection,
        socketEvents: this.socketEvents
      }));
      statusCollection.fetch();
    },

    addcontact: function() {
      this.changeView(new addContactView());
    },

    login: function() {
      this.changeView(new loginView({socketEvents: this.socketEvents}));
    },

    register: function() {
      this.changeView(new registerView());
    },

    forgotpassword: function() {
      this.changeView(new forgotpasswordView());
    },

    profile: function(id) {
      var model = new Account({id: id});
      this.changeView(new profileView({
        model: model,
        socketEvents: this.socketEvents
      }));
      model.fetch();
    },

    contacts: function(id) {
      var contactId = id ? id : 'me';
      var contactsCollection = new ContactCollection();
      contactsCollection.url = '/accounts/' + contactId + '/contacts';
      this.changeView(new contactsView({
        collection: contactsCollection
      }));
      contactsCollection.fetch();
    }
  });

  return new SocialRouter();
});
