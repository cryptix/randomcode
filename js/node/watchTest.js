var fs = require('fs')
var fname = process.ARGV[2];

if (!fname)
	return console.log("Usage: node watchTest.js filename");

fs.watchFile(fname, function(curr, prev) {
	console.log('the current mtime is: ' + curr.mtime);
	console.log('the previous mtime was: ' + prev.mtime);
});
