define(['text!templates/profile.html', 'text!templates/status.html', 'models/Status', 'views/status'],
    function(profileTemplate, statusTemplate, Status, StatusView)
{
  var profileView = Backbone.View.extend({
    el: $('#content'),

    events: {
      'submit form': 'postStatus'
    },

    initialize: function(opts) {
      this.socketEvents = opts.socketEvents;
      this.model.bind('change', this.render, this);
    },

    postStatus: function() {
      var view = this;
      var statusText = $('input[name=status]').val();
      var statusCollection = this.collection;
      $.post('/accounts/' + this.model.get('_id') + '/status', {
        status: statusText
      });
      return false;
    },

    prependStatus: function(statusModel) {
      var statusHtml = (new StatusView({model: statusModel})).render();
      $(statusHtml).prependTo('.status_list').hide().fadeIn('slow');
    },

    onSocketStatusAdded: function(data) {
      var newStatus = data.data;
      this.prependStatus(new Status({
        status:newStatus.status,
          name:newStatus.name
      }));
    },

    render: function() {
      var view = this;
      if (this.model.get('_id')) {
        this.socketEvents.bind('status:' + this.model.get('_id'), this.onSocketStatusAdded, this);
      }
      this.$el.html( _.template(profileTemplate, this.model.toJSON()));
      var statusCollection = this.model.get('status');
      if( null != statusCollection) {
        _.each(statusCollection, function(statusJson) {
          var statusModel = new Status(statusJson);
          view.prependStatus(statusModel);
        });
      }
    }
  });

  return profileView;
});
