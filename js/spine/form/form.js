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
    alert("Contact failed to save - " + msg);
});

var Contacts = Spine.Controller.create({
    elements: {
        "form#contactForm": "form"
    },
    events: {
        "submit form#contactForm": "create"
    },

    create: function(e) {
        e.preventDefault();
        var data = this.form.serializeForm();
        var user = Contact.create(data);
        if (user) alert('Hi, ' + user.firstname + ' ' + user.lastname);
    }
});

Contacts.init({
    el: $("body")
});