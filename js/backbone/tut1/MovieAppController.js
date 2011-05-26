var MovieAppController = Backbone.Controller.extend({
  initialize: function (params) {
    this.model = new MovieAppModel();
    this.view = new MovieAppView({model: this.model});

    params.append_at.append(this.view.render().el);
  },
  routes: {
      'movies/add': 'add',
      'movies/remove/:number': 'remove'
  },
  add: function () {
    app.model.movies.add(new Movie({
        title: 'The Matrix ' + Math.floor(Math.random()*11),
        format: 'dvd'
      })
    );

    this.saveLocation();
  },
  remove: function (cid) {
    app.model.movies.remove(app.model.movies.getByCid(cid));
  }
});
