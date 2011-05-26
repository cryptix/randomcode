var MovieAppView = Backbone.View.extend({
  initialize: function () {
    _.bindAll(this, 'addMovie', 'removeMovie');
    // this.model refers to the model we pass to the view when we
    // first init our view. So here we listen for changes to the movie collection.
    this.model.movies.bind('add', this.addMovie);
    this.model.movies.bind('remove', this.removeMovie);
  },
  // grab and populate our main template
  render: function () {
    var template = '<h1>Movie App</h1><a href="#movies/add">add new movie</a><ul id="movieList"></ul>';
    $(this.el).html(Mustache.to_html(template, this.model.toJSON()));

    // store a reference to our movie list
    this.movieList = this.$('#movieList');

    return this;
  },
  addMovie: function (movie) {
    var view = new MovieView({model: movie});

    // here we use our stored reference to the movie list element and
    // append our rendered movie view.
    this.movieList.append(view.render().el);
  },
  removeMovie: function (movie) {
    // here we can use the html ID we stored to easily find
    // and remove the correct element/elements from the view if the
    // collection tells us it's been removed.
    this.$('#movie_' + movie.cid).remove();
  }
});
