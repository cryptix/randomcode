require.config({
  paths: {
    jQuery: '/js/libs/jquery',
    Underscore: '/js/libs/underscore',
    Backbone: '/js/libs/backbone',
    Sockets: '/socket.io/socket.io',
    text: '/js/libs/text',
    templates: '../templates'
  },

  shim: {
    'Backbone': ['Underscore', 'jQuery'],
    'SocialNet': ['Backbone']
  }
});
require(['SocialNet'], function(SocialNet) {
  SocialNet.initialize();
});
