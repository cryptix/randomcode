var http = require('http'),
      fs = require('fs');

var fname = process.ARGV[2]
if(!fname) return console.log('usage: node %s fname', process.ARGV[1]);

s = http.createServer(function (req, res) {
  var changesCount = 5;
  res.writeHead(200, { 'Content-Type': 'text/plain' });

  res.write('hi, watching: ' + fname + '\n');

  fs.watchFile(fname, function(curr, prev) {
    res.write('\nthe previous size was: ' + prev.size);
    res.write('\nthe current size is: ' + curr.size);

    changesCount -= 1;
    console.log('changes left:' + changesCount);
    if(changesCount === 0) res.end('\n\nBye');
  });
});


s.listen(3000);

console.log('http watch server running');
