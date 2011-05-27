(function () {
  if (typeof exports !== 'undefined') {
    redis = require('redis');
    rc = redis.createClient();
    models = require('../models/models.js');

    // hash dependencies.. wtf?
    require('joose')
    require('joosex-namespace-depended')
    require('hash');
  } else {
    throw new Error('auth.js must be loaded as a module,');
  }

  var verifyUserAccount = function (foundUserName, pass, fn) {
    var rKey = 'user:' + foundUserName;

    rc.get(rKey + '.salt', function (err, data) {
      if (err) return fn(new Error('[verifyUserAccount] GET failed for key: ' + rKey + '.salt'));

      if (data) {
        var calculatedHash = Hash.sha512(data + '_' + pass);
        rc.get(rKey + '.hashPass', function (err, data) {
          if (err) return fn(new Error('[verifyUserAccount] GET failed for key: ' + rKey + '.hashPass'));

          if (calculatedHash === data) {
            console.log('[verifyUserAccount] Auth succeeded for ' + foundUserName);

            rc.get(rKey + '.profile', function (err, data) {
                if (err) return fn(new Error('[verifyUserAccount] GET failed for key: ' + rKey + '.profile'));

                var foundUser = new models.User();
                foundUser.mport(data);
                foundUser.set({'hashPass': calculatedHash});

                return fn(null, foundUser);
            });
          } else {
            return fn(new Error('[verifyUserAccount] invalid password'));
          }
        });
      } else {
        return fn(new Error('[verifyUserAccount] salt not found'));
      }
    });
  };

  exports.authenticateUser = function (name, pass, fn) {
    console.log('[authenticate] Starting auth for ' + name);

    var rKey = 'user:' + name;

    rc.get(rKey, function (err, data) {
      if (err) return fn(new Error('[authenticateUser] SET failed for key: ' + rKey + ' for value: ' + name));

      if (!data) {
        fn(new Error('[authenticateUser] invalid password'));
      } else {
        console.log('[authenticateUser] user: ' + name + 'found in store. Verifying password.');
        verifyUserAccount(data, pass, fn);
      }
    });
  };

  exports.createNewUserAccount = function (name, pass1, pass2, email, ponies, fn) {
    if (pass1 !== pass2) return fn(new Error('[createNewUserAccount] Passwords do not match'));

    var newUser = new models.User({name: name, email: email, ponies: ponies});
    var rKey = 'user:' + name;

    rc.set(rKey, name, function (err, data) {
        if (err) return fn(new Error('[createNewUserAccount] SET failed for key: ' + rKey + ' for value: ' + name));
        
        var salt = new Date().getTime();
        rc.set(rKey + '.salt', salt, function (err, data) {
          if (err) return fn(new Error('[createNewUserAccount] SET failed for key: ' + rKey + '.salt for value: ' + salt));

          var hashPass = Hash.sha512(salt + '_' + pass1);
          rc.set(rKey + '.hashPass', hashPass, function(err, data) {
            if (err) return fn(new Error('[createNewUserAccount] SET failed for key: ' + rKey + '.hashPass for value: ' + hashPass));

            rc.set(rKey + '.profile', newUser.xport(), function (err, data) {
              if (err) return fn(new Error('[createNewUserAccount] SET failed for key: ' + rKey + '.profile for new User profile'));

              newUser.set({'hashPass': hashPass});
              return fn(null, newUser);
            });
          });
        });
    });
  };
}());
