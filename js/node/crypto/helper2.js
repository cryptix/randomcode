var crypto = require('crypto');
var key = "some keys are better than others";
var msg = "Attack Troy from within a wooden horse!";
var CYPHER = "aes256";


var test = function(msg) {
  var cypher = crypto.createCipher(CYPHER, key);
  var enc_msg = cypher.update(msg, "utf8", 'binary');
  enc_msg += cypher.final('binary');

  enc_msg= new Buffer(enc_msg, 'binary').toString('base64');

  var decypher = crypto.createDecipher(CYPHER, key);
  var dec_msg = decypher.update(enc_msg, 'base64', "utf8");
  dec_msg += decypher.final("utf8");

  console.log('i: -> '+ msg, '\no: -> '+dec_msg, '\nc: -> "'+ enc_msg + '"\n');
};

var i= 0;
(function loop () {
  var txt= msg.substr(0, i++);
  test(txt, 'binary');
  
  if (txt.length < msg.length) process.nextTick(loop);
})();