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
    this.model.movies.add(new Movie({
        title: 'The Matrix ' + Math.floor(Math.random()*11),
        format: 'dvd'
      })
    );

    this.saveLocation();
  },
  remove: function (cid) {
    this.model.movies.remove(this.model.movies.getByCid(cid));
  }
});
