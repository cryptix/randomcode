//jQuery plugin
$.fn.serializeForm = function() {
    var result = {};
    $.each($(this).serializeArray(), function(i, item) {
        result[item.name] = item.value;
    });
    return result;
};

var Contact = Spine.Model.setup('Contact', ['firstname', 'lastname']);
Contact.include({
    validate: function() {
        if (!this.firstname) return "First name is required";
        if (!this.lastname) return "Last name is required";
    }
});

Contact.bind("error", function(rec, msg) {
    rec.controller.trigger('validateError', msg);
});

var Contacts = Spine.Controller.create({
    elements: {
        "form#contactForm": "form"
    },
    events: {
        "submit form#contactForm": "create"
    },
    init: function() {
      this.bind('validateError', this.error);
    },

    create: function(e) {
        e.preventDefault();
        var data = this.form.serializeForm();
        data.controller = this;
        var user = Contact.create(data);
        if (user) alert('Hi, ' + user.firstname + ' ' + user.lastname);
    },

    error: function(msg) {
      $('#validate').append($('<li></li>').text("Contact failed to save - " + msg));
    }
});

Contacts.init({
    el: $("body")
});

