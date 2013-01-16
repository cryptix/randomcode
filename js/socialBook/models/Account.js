// TODO: update to a random per user based salt
var SECRET_SALT = "9d311ad88ba1fd80b0c143bd19377f3da94a4cbaada1a39fa253c4b488f360ed7d62ba6234514ff1d3060d8914b244bee38573cded144bb59c6dbd8ce7ab581a";

module.exports = function(config, mongoose, nodemailer) {
  var crypto = require('crypto');

  var Status = new mongoose.Schema({
    name: {
      first: { type: String },
      last:  { type: String}
    },
    status: { type: String }
  });

  var AccountSchema = new mongoose.Schema({
    email:    { type: String, unique: true, index: true },
    password: { type: String },
    name: {
      first: { type: String },
      last:  { type: String }
    },
    birthday: {
      day:   {type: Number, min: 1, max: 31, required: false },
      month: {type: Number, min: 1, max: 12, required: false },
      year:  {type: Number, min: 1850 }
    },
    photoUrl:  { type: String },
    biography: { type: String },
    status: [Status], // My own updates ownly
    activity: [Status] // All updates, including friends
  });

  var Account = mongoose.model('Account', AccountSchema);

  var changePassword = function(accountId, newPassword) {
    var shaSum = crypto.createHash('sha256');
    shaSum.update(SECRET_SALT + newPassword);
    var hashedPassword = shaSum.digest('hex');
    Account.update({_id:accountId}, {$set: {password:hashedPassword}}, {upsert:false},
      function changePasswordCallback(err) {
        console.log('Change password done for account ' + accountId);
      });
  };

  var forgotPassword = function(email, resetPasswordUrl, callback) {
    var user = Account.findOne({email: email}, function findAccount(err, doc) {
      if (err) {
        // Email address is not a valid user
        callback(false);
      } else {
        var smtpTransport = nodemailer.createTransport('SMTP', config.mail);
        resetPasswordUrl += '?account='+doc._id;
        smtpTransport.sendMail({
          from: 'dont-reply@social.net',
          to: doc.email,
          subject: 'SocialNet Password Reset Request',
          text: 'Click here to reset your password: ' + resetPasswordUrl
        }, function forgotPasswordResult(err) {
          if (err) {
            // email wasn't send
            // TODO: supplu different error states to callback?
            callback(false);
          } else {
            callback(true);
          }
        });
      }
    });
  };

  var login = function(email, password, callback) {
    var shaSum = crypto.createHash('sha256');
    shaSum.update(SECRET_SALT + password);
    Account.findOne({email:email, password:shaSum.digest('hex')}, function(err, doc) {
      callback(doc);
    });
  };

  var findById = function(accountId, callback) {
    Account.findOne({_id:accountId}, function(err, doc) {
      callback(doc);
    });
  };

  var register = function(email, password, firstName, lastName) {
    var shaSum = crypto.createHash('sha256');
    shaSum.update(SECRET_SALT + password);

    console.log('Registering ' + email);
    var user = new Account({
      email: email,
      name: {
        first: firstName,
        last: lastName
      },
      password: shaSum.digest('hex')
    });
    user.save(function registerCallback(err) {
      if (err) {
        return console.log(err);
      }
      return console.log('Account was created');
    });
    console.log('save command was sent');
  };

  return {
    findById: findById,
    register: register,
    forgotPassword: forgotPassword,
    changePassword: changePassword,
    login: login,
    Account: Account
  };
};
