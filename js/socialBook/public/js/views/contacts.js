define(['views/contact', 'text!templates/contacts.html'], function(ContactView, contactsTemplate) {
  var contactsView = Backbone.View.extend({
    el: $('#content'),

    initialize: function() {
      this.collection.on('reset', this.renderCollection, this);
    },

    render: function() {
      this.$el.html(contactsTemplate);
    },

    renderCollection: function(collection) {
      collection.each(function(contact) {
        var statusHtml = (new ContactView({ removeButton: true, model: contact })).render().el;
        $(statusHtml).appendTo('.contacts_list');
      });
    }
  });

  return contactsView;
});
