var Donut = Backbone.Model.extend({});

var bostonCream = new Donut({
  name: "Bostan Cream",
  cream_filled: true
});

bostonCream.save(); // RESTful POST

//asumming success
bostonCream.id // -> 3, or whatever our JSOn api saved it under.

bostonCream.set({
  sprinkles:false,
  name: "Boston Cream"
});

bostonCream.save(); // now doing a PUT on 'donuts/3'


//Backone.Collection

var Donuts = Backbone.Collection.extend({
  model: Donut,
  url : "/donuts"
});

var donuts = new Donuts;

donuts.fetch(); // calls the server to populate the model

donuts.at(0); // by index in the collection
donuts.get(3); // by model ID

// _ awesomeness
donuts.each(function(d) { console.log(d.get('name')); });
donuts.select(function(d) { return donut.get('name').length > 2; });
donuts.map(function(d) { return donut.get('name'); });

// nested collections
var DonutShop = Backbone.Model.extend({
  defaults: {
    name: 'Untitled'
  },

  initialize: function() {
    this.donuts = new Donuts;
    this.donuts.url = 'donut_shops/' + this.id + '/donuts';
  }
});
    
