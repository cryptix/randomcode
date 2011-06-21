jQuery(function($) {
  var Users  = Spine.Controller.create();
  var Groups = Spine.Controller.create();
  var Links = Spine.Controller.create();

  var users  = Users.init({ el: $('#layout1 .users') });
  var groups = Groups.init({ el: $('#layout1 .groups') });
  var links  = Links.init({ el: $('#layout1 .links') });

  Spine.Manager.init(users, groups, links);

  var tabs = Spine.Tabs.init({el: $('#layout1 .tabs') });
  tabs.connect('users', users);
  tabs.connect('groups', groups);
  tabs.connect('links', links);

  tabs.render();
});
