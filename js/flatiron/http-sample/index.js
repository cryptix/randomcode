console.time('start');
var flatiron = require('flatiron')
  , app = flatiron.app;

app.use(flatiron.plugins.http, {
});

app.get(/foo/, function() {
  this.res.writeHead(200, { 'Content-Type': 'text/plain' });
  this.res.end('Hello world\n');
});

app.listen(8080);
console.timeEnd('start');
console.log('Flatiron HTTP started');
