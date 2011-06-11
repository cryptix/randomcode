$(document).ready(function () {
    var person, Mperson = Backbone.Model.extend({
      defaults: {
        name: 'Fetus',
        age: 0,
        children: []
      },
      validate: function (attributes) {
        if (attributes.age < 0 && attributes.name != 'Dr manhatten') {
          return "You can't be negative years old";
        }
      },
      initialize: function () {
        alert('Welcome to this World');
        this.bind('change:name', function () {
          var name = this.get('name');
          alert('Changed my name to ' + name);
        });
        this.bind('error', function (model, err) {
          // We have received an error, log it, alert it or forget it :p
          console.dir(err);
        });
      },
      adopt: function (newChildsname) {
        var children_array = this.get('children');
        children_array.push( newChildsname );
        this.set({children: children_array});
      }
    });

    // set
    person = new Mperson({ name: "Thomas", age: 67, children: ['Ryan']});

    /* or this way, they are equivalent
    delete person;
    person = new Person();
    person.set({ name: "Thomas", age: 67});
    */

    // get
    var age = person.get('age'); // 67
    var name = person.get('name'); // 'Thomas'

    person.adopt('John Resig');

    var children = person.get('children'); // ['Ryan', 'John Resig']

    // trigger change event
    person.set({name: 'Steve'});

    //validate
    person.set({age: -1});

    console.log('Done.');
});
