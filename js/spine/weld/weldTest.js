// jQuery Plugin
$.fn.weld = function (data, config) {
  return this.each (function () {
    weld(this, data, config);
  });
};

// Create Model
var Contact = Spine.Model.setup('Contact', ['firstname', 'lastname']);
Contact.extend(Spine.Model.Local);

// Create List, override default template
var SideBar = Spine.List.create({
    template: function(items) {
        console.dir(items);
        $('.item').weld(items, {
            alias: {
                id: false,
                newRecord: false
            },
            debug: true
        });
    }
});


// Create Controller
var Contacts = Spine.Controller.create({
    elements: {
        '#sidebar': 'listEl',
        '#main': 'main'
    },
    proxied: ['render', 'change'],

    init: function() {
        this.list = SideBar.init({
            el: this.listEl
        });
        this.list.bind('change', this.change);

        Contact.bind('refresh change', this.render);
    },

    render: function() {
        this.list.render(Contact.all());
        if (this.current) $('#main').weld(this.current);
    },

    change: function(item) {
        this.current = item;
        this.render();
    }
});

Contacts.init({
    el: $('#layout2')
});
Contact.fetch();

if (Contact.all().length === 0) {
    var c1 = Contact.create({
        firstname: 'Winfrey',
        lastname: 'Nerdish'
    });
    c1.save();

    var c2 = Contact.create();
    c2.firstname = 'Joffrey';
    c2.lastname = 'Nerdish';
    c2.save();

    var c3 = Contact.create();
    c3.firstname = 'Nyancat';
    c3.lastname = 'Overload';
    c3.save()
}
