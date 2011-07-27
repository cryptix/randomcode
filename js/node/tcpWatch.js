var net = require('net'),
     fs = require('fs');

var fname = process.ARGV[2]
if(!fname) return console.log('usage: node %s fname', process.ARGV[1]);

s = net.createServer(function (c) {
  var changesCount = 5;

  c.write('hi, watching: ' + fname + '\n\n');

  fs.watchFile(fname, function(curr, prev) {
    c.write('\nthe previous mtime was: ' + prev.size);
    c.write('\nthe current mtime is: ' + curr.size);

    changesCount -= 1;
    console.log('changes left:' + changesCount);
    if(changesCount === 0) c.end('\n\nBye');
  });
});


s.listen(3000);

console.log('tcp watching Server running');
