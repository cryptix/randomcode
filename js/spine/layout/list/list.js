$(document).ready(function() {
  // Create Model
  var Contact = Spine.Model.setup('Contact', ['name']);
  Contact.extend(Spine.Model.Local);

  // Create List, override default template
  var SideBar = Spine.List.create({
    template: function(items) {
      return $('#contacts-template').tmpl(items);
    }
  });


  // Create Controller
  var Contacts = Spine.Controller.create({
    elements: {'ul#sidebar': 'listEl', '#main': 'main'},
    proxied: ['render', 'change'],

    init: function() {
      this.list = SideBar.init({el: this.listEl});
      this.list.bind('change', this.change);

      Contact.bind('refresh change', this.render);
    },

    render: function() {
      this.list.render(Contact.all());
      this.main.html($('#contact-template').tmpl(this.current));
    },

    change: function(item) {
      this.current = item;
      this.render();
    }
  });

  Contacts.init({el: $('#layout2')});
  Contact.fetch();

  if (Contact.all().length === 0) {
    var c1 = Contact.create({name: 'blurp'});
    c1.save();

    var c2 = Contact.create({name: 'blarp'});
    c2.save();
  }
});
