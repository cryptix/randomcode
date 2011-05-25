var ChatView = Backbone.View.extend({
  tagName: 'li',

  initialize: function(options) {
    _bindAll(this, 'render');
    this.model.bind('all', this.render);
  },

  render: function() {
    $(this.el).html(this.model.get('name') + ': ' + this.model.get('text'));
  }
});

var ClientCountView = Backbone.View.extend({
  initialize: function(options) {
    _bindAll(this, 'render');
    this.model.bind('all', this.render);
  },
  render: function() {
    $(this.el).html(this.model.get('clients'));
    return this;
  },
});

NodeChatView = Backbone.View.extend({
  initialize: function(options) {
    this.model.chats.bind('add', this.addChat);
    this.socket = options.socket;
    this.clientCountView = new ClientCountView({model: new models.ClientCountModel(), el: $('#client_count')});
  },
  events: {
    'submit #messageForm': 'sendMessage'
  },
  addChat: function(chat) {
    var view = new ChatView({model: chat})
    $('#chat_list').append(view.render().el);
  },
  msgReceived: function(message) {
    switch(message.event) {
      case 'initial':
        this.model.mport(message.data);
        break;
      case 'chat':
        var newChatEntry = new models.ChatEntry();
        newChatEntry.mport(message.data);
        this.model.chats.add(newChatEntry);
        break;
      case 'update':
        this.clientCountView.model.updateClients(message.clients);
        break;
    }
  },
  sendMessage: function() {
    var nameField = $('input[name=user_name]');
    var inputField = $('input[name=message]');
    var chatEntry = new models.ChatEntry({name: nameField.val(), text: inputField.val()});
    this.socket.send(chatEntry.xport());
    inputField.val('');
  },
});
