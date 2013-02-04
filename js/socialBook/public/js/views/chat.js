define(['views/chatSession', 'views/chatItem', 'text!templates/chat.html'],
  function(ChatSessionView, ChatItemView, chatItemTemplate) {
    var chatView = Backbone.View.extend({
      el: $('#chat'),

      chatSessions: {},

      initialize: function(opts) {
        this.socketEvents = opts.socketEvents;
        this.collection.on('reset', this.renderCollection, this);
      },

      render: function() {
        this.$el.html(chatItemTemplate);
      },

      startChatSession: function(model) {
        var accountId = model.get('accountId');
        if ( !this.chatSessions[accountId] ) {
          var chatSessionView = new ChatSessionView({
            model: model,
            socketEvents: this.socketEvents
          });
          this.$el.prepend(chatSessionView.render().el);
          this.chatSessions[accountId] = chatSessionView;
        }
      },

      renderCollection: function(collection) {
        var view = this;
        $('.chat_list').empty();
        collection.each(function(contact) {
          var chatItemView = new ChatItemView({
            socketEvents: view.socketEvents,
            model: contact
          });
          chatItemView.bind('chat:start', view.startChatSession, view);
          var statusHtml = chatItemView.render().el;
          $('.chat_list').append(statusHtml);
        });
      }
    });

    return chatView;
  }
);
