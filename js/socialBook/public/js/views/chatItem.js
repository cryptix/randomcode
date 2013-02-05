define(['text!templates/chatItem.html'], function(chatItemTemplate) {
  var chatItemView = Backbone.View.extend({
    tagName: 'li',

    $el: $(this.el),

    events: {
      'click': 'startChatSession'
    },

    initialize: function(opts) {
      var accountId = this.model.get('accountId');
      opts.socketEvents.bind(
        'login:' + accountId,
        this.handleContactLogin,
        this
      );
      opts.socketEvents.bind(
        'logout:' + accountId,
        this.handleContactLogout,
        this
      );
      opts.socketEvents.bind(
        'socket:chat:start:' + accountId,
        this.startChatSession,
        this
      );
    },

    handleContactLogin: function() {
      this.model.set('online', true);
      this.$el.find('.online_indicator').addClass('online');
    },

    handleContactLogout: function() {
      this.model.set('online', false);
      var $onlineIndicator = this.$el.find('.online_indicator');
      while ($onlineIndicator.hasClass('online')) { //TODO: wtf?
        $onlineIndicator.removeClass('online');
      }
    },

    startChatSession: function() {
      this.trigger('chat:start', this.model);
    },

    render: function() {
      this.$el.html(_.template(chatItemTemplate, {
        model: this.model.toJSON()
      }));
      if (this.model.get('online') ) this.handleContactLogin();
      return this;
    }
  });

  return chatItemView;
});
