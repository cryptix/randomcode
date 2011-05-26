var MovieView = Backbone.View.extend({
  initialize: function (args) {
    _.bindAll(this, 'changeTitle');

    this.model.bind('change:title', this.changeTitle);
  },
  events: {
    'click .title': 'handleTitleClick'
  },
  render: function () {
    var template = '<li id="movie_{{ cid }}"><span class="title">{{ title }}</span> <span>{{ format }}</span>   <a href="#movies/remove/{{ cid }}">x</a></li>';
    var context = _.extend(this.model.toJSON(), {cid: this.model.cid});
    $(this.el).html(Mustache.to_html(template, context));
    return this;
  },
  changeTitle: function () {
    this.$('.title').text(this.model.get('title'));
  },
  handleTitleClick: function () {
    alert('you clicked the title: ' + this.model.get('title'));
  }
});
