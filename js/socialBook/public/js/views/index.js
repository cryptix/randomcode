define(['text!templates/index.html', 'views/status', 'models/Status'], function(indexTemplate, StatusView, Status) {
  var indexView = Backbone.View.extend({
    el: $('#content'),

    events: {
      'submit form': 'updateStatus'
    },

    initialize: function(opts) {
      opts.socketEvents.bind('status:me', this.onSocketStatusAdded, this);
      this.collection.on('add', this.onStatusAdded, this);
      this.collection.on('reset', this.onStatusCollectionReset, this);
    },

    onStatusCollectionReset: function(collection) {
      var view = this;

      collection.each(function(model) {
        view.onStatusAdded(model);
      });
    },

    onStatusAdded: function(statusModel) {
      var statusHtml = (new StatusView({model: statusModel})).render();
      $(statusHtml).prependTo('.status_list').hide().fadeIn('slow');
    },

    onSocketStatusAdded: function(data) {
      var newStatus = data.data;
      var found = false;
      //TODO: weird duplication hack..
      this.collection.forEach(function(status) {
        var name = status.get('name');
        var txt  = status.get('status');
        if ( name && name.full == newStatus.name.full && txt == newStatus.status ) {
          found = true;
        }
      });
      if (!found) {
        this.collection.add(new Status({status:newStatus.status, name:newStatus.name}));
      }
    },

    updateStatus: function() {
      var statusText = $('input[name=status]').val();
      var statusCollection = this.collection;
      $.post('/accounts/me/status', {
        status: statusText
      });
      return false;
    },

    render: function() {
      this.$el.html(indexTemplate);
    }
  });

  return indexView;
});
