////
// routes for status and activity updates
//
module.exports = function(app, models) {
  app.get('/accounts/:id/status', function(req, res) {
    var accountId = req.params.id == 'me' ? req.session.accountId : req.params.id;
    models.Account.findById(accountId, function(account) {
      res.send(account.status);
    });
  });

  app.post('/accounts/:id/status', function(req, res) {
    //TODO: refactor auth check
    //TODO: escape status text to clear xss
    var accountId = req.params.id == 'me' ? req.session.accountId : req.params.id;
    models.Account.findById(accountId, function(acc) {
      var newS = {
        name: acc.name,
      status: req.param('status', '')
      };
      acc.status.push(newS);
      // push the status to all friends
      acc.activity.push(newS);
      acc.save(function(err) {
        if(err) {
          console.log('Error saving account: ' + err);
        }
      });
    });
    res.send(200);
  });

  app.get('/accounts/:id/activity', function(req, res) {
    var accountId = req.params.id == 'me' ? req.session.accountId : req.params.id;
    models.Account.findById(accountId, function(acc) {
      if (acc == null) return res.send(500);
      res.send(acc.activity);
    });
  });
};
