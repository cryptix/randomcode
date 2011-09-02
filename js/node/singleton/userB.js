var m = require('./master.js');

setTimeout(function () {
  m.inc();
  console.log('increased from B');
}, 250);

setTimeout(function () {
  console.log('Master Count: ' + m.out());
}, 1000);
