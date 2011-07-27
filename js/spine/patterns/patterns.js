//jQuery plugin
$.fn.serializeForm = function() {
    var result = {};
    $.each($(this).serializeArray(), function(i, item) {
        result[item.name] = item.value;
    });
    return result;
};

// Contact Model
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

// ModelView Controller
var ContactItem = Spine.Controller.create({
    events: {
        'click': 'click',
        'click .remove': 'remove'
    },
    proxied: ['render', 'remove'],

    init: function() {
        this.item.bind('update', this.render);
        this.item.bind('destroy', this.remove);
    },

    render: function(item) {
        if(item) this.item = item;

        this.el.html(this.template(this.item));
        return this;
    },

    template: function(items) {
        return $('#contacts-template').tmpl(items);
    },

    remove: function() {
        this.el.remove();
    },

    click: function() {
        console.log('clicked' + this.item.id);
    }
});

// Item Controller
var Contacts = Spine.Controller.create({
    proxied: ['addOne', 'addAll'],

    init: function() {
        Contact.bind("refresh", this.addAll);
        Contact.bind("create", this.addOne);
    },
    elements: {
        "form#contactForm": "form",
        "ul#contacts": "list"
    },

    events: {
        "submit form#contactForm": "create"
    },

    create: function(e) {
        e.preventDefault();
        var data = this.form.serializeForm();
        var user = Contact.create(data);
    },

    addOne: function(item) {
        var user = ContactItem.init({item: item});
        this.list.append(user.render().el);
    },

    addAll: function() {
        Contact.each(this.AddOne);
    }
});

Contacts.init({
    el: $("body")
});
