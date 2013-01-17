module.exports = function(app, models) {
  // contacts
  app.get('/accounts/:id/contacts', function(req, res) {
    var accountId = req.params.id == 'me' ? req.session.accountId : req.params.id;
    models.Account.findById(accountId, function(acc) {
      res.send(acc.contacts);
    });
  });

  app.post('/accounts/:id/contact', function(req, res) {
    var accountId = req.params.id == 'me' ? req.session.accountId : req.params.id;
    var contactId = req.param('contactId', null);
    if (null == contactId || contactId.length < 1) {
      res.send(400);
      return;
    }
    models.Account.findById(accountId, function(acc) {
      if (acc) {
        models.Account.findById(contactId, function(cont) {
          models.Account.addContact(acc, cont);
          models.Account.addContact(cont, acc);
          //acc.save();
        });
      }
    });
    // returns immediatly and processes in background
    res.send(200);
  });

  app.delete('/accounts/:id/contact', function(req, res) {
    var accountId = req.params.id == 'me' ? req.session.accountId : req.params.id;
    var contactId = req.param('contactId', null);
    if (null == contactId) {
      res.send(400);
      return;
    }
    models.Account.findById(accountId, function(acc) {
      if(!acc) return;
      models.Account.findById(contactId, function(cont, err) {
        if (!cont) return;
        models.Account.removeContact(acc, contactId);
        models.Account.removeContact(cont, accountId);
      });
    });
    // returns immediatly and processes in background
    res.send(200);
  });

  app.post('/contacts/find', function(req, res) {
    // TODO: auth check
    var searchStr = req.param('searchStr', null);
    if (null == searchStr || searchStr.length < 1) {
      res.send(400);
      return;
    }
    models.Account.findByString(searchStr, function onSearchDone(err, accounts) {
      if(err || accounts.length == 0) {
        res.send(404);
      } else {
        res.send(accounts);
      }
    });
  });
};
