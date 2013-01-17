var MyRouter = Backbone.Router.extend({
  routes: {
  },

  getCertificate: function(id) {
    // use id
    new CertificateView({ el: $('#certificate")});
  }
});

var router = new MyRouter;
Backbone.history.start();
