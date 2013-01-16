define(['text!templates/index.html', 'views/status', 'models/Status'], function(indexTemplate, StatusView, Status) {
  var indexView = Backbone.View.extend({
    el: $('#content'),

    events: {
      'submit form': 'updateStatus'
    },

    initialize: function() {
      this.collection.on('add', this.onStatusAdded, this);
      this.collection.on('reset', this.onStatusCollectionReset, this);
    },

    onStatusCollectionReset: function(collection) {
      var view = this;

      collection.each(function(model) {
        view.onStatusAdded(model);
      });
    },

    onStatusAdded: function(status) {
      var view = new StatusView({ model: status })
      var statusHtml = view.render();
      $(statusHtml).prependTo('.status_list').hide().fadeIn('slow');
    },

    updateStatus: function() {
      var statusText = $('input[name=status]').val();
      var statusCollection = this.collection;

      $.post('/accounts/me/status', {
        status: statusText
      }, function(data) {
        statusCollection.add(new Status({status: statusText}));
      });
      return false;
    },

    render: function() {
      this.$el.html(indexTemplate);
    }
  });

  return indexView;
});
