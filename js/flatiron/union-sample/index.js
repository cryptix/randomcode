var fs         = require('fs')
  , union      = require('union')
  , sugarskull = require('sugarskull');

var router = new sugarskull.http.Router();

var server = union.createServer({
  before: [
    function (req, res) {
      var found = router.dispatch(req, res);
      if(!found) {
        res.emit('next');
      }
    }
  ]
});

router.get(/foo/, function() {
  this.res.writeHead(200, { 'Content-Type': 'text/plain' });
  this.res.end('hello world\n');
});

server.listen(3000);
console.log('union with sugarskull running on 3000');
