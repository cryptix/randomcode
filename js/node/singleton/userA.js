var m = require('./master.js');

setTimeout(function() {
  m.inc();
  m.inc();
  console.log('increased twice from A');
}, 500);
