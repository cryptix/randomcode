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
        if (!this.firstname) return {msg: "First name is required", field: 'firstname'};
        if (!this.lastname) return {msg: "Last name is required", field: 'lastname'};
    }
});

/*
Contact.bind("error", function(rec, msg) {
});
*/

var Contacts = Spine.Controller.create({
    elements: {
        "form#contactForm": "form"
    },
    events: {
        "submit form#contactForm": "create"
    },
    init: function() {
    },

    create: function(e) {
        e.preventDefault();
        var data = this.form.serializeForm();
        var user = Contact.init(data);
        var err = user.validate();
        if (typeof err === 'undefined') {
          console.log('Hi, ' + user.firstname + ' ' + user.lastname);
        } else {
          console.log('err: ' + err.msg);
          $('input[name=' + err.field + ']').focus();
        }
    }
});

Contacts.init({ el: $("body") });
