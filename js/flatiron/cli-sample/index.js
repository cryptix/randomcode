console.time('start');

var flatiron = require('flatiron')
  , app = flatiron.app;

app.use(flatiron.plugins.cli, {
  dir: __dirname,
  usage: [
    'Simple app example for latiron!',
    '',
    'app start - print a promt and arguments',
    'print <msg> - echo message'
  ]
});

app.cmd('app start', function() {
  console.timeEnd('start');
  console.dir('it works!!!');
  app.prompt.get('name', function(err, name) {
    console.dir(arguments);
  });
});

app.init(function() {
  app.start();
});
