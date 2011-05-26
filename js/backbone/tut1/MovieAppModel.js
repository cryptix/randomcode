var MovieAppModel = Backbone.Model.extend({
  initialize: function () {
    // init and store our MovieCollection in our app object
    this.movies = new MovieLibrary();
  }
});
