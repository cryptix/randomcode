////
// Account routes
module.exports = function(app, models) {

  // account info
  app.get('/accounts/:id', function(req, res) {
    //TODO: refactor auth check
    var accountId = req.params.id == 'me' ? req.session.accountId : req.params.id;
    models.Account.findById(accountId, function(account) {
      if (account == null) res.send(500);
      if (accountId == 'me' || models.Account.hasContact(account, req.session.accountId) ) {
        account.isFriend = true;
      }
      delete account['password'];
      res.send(account);
    });
  });

  // contacts/friends
  app.get('/accounts/:id/contacts', function(req, res) {
    var accountId = req.params.id == 'me' ? req.session.accountId : req.params.id;
    models.Account.findById(accountId, function(acc) {
      res.send(acc.contacts);
    });
  });

  // add contact
  app.post('/accounts/:id/contact', function(req, res) {
    var accountId = req.params.id == 'me' ? req.session.accountId : req.params.id;
    var contactId = req.param('contactId', null);
    if (null == contactId) {
      res.send(400);
      return;
    }
    models.Account.findById(accountId, function(acc) {
      if (acc) {
        models.Account.findById(contactId, function(cont) {
          models.Account.addContact(acc, cont);
          models.Account.addContact(cont, acc);
          acc.save();
        });
      }
    });
    // returns immediatly and processes in background
    res.send(200);
  });

  // remove contact
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

  // search for contacts
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

  // get status posts
  app.get('/accounts/:id/status', function(req, res) {
    var accountId = req.params.id == 'me' ? req.session.accountId : req.params.id;
    models.Account.findById(accountId, function(account) {
      res.send(account.status);
    });
  });

  // post a status
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
        } else {
          app.triggerEvent('event:' + accountId, {
            from: accountId,
            data: newS,
            action: 'status'
          });
        }
      });
    });
    res.send(200);
  });

  // get friend activity
  app.get('/accounts/:id/activity', function(req, res) {
    var accountId = req.params.id == 'me' ? req.session.accountId : req.params.id;
    models.Account.findById(accountId, function(acc) {
      if (acc == null) return res.send(500); // TODO: had this on iPad. reproduce!
      res.send(acc.activity);
    });
  });
};
