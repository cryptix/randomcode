var jsdom = require('jsdom'),
    http=require('http'),
    url=require('url');

var u=url.parse(process.argv.length>2?process.argv[2]:'http://boards.4chan.org/tv/res/16225459');

var options = {
	host: u.host,
	port: u.port||80,
	path: u.pathname||'/'
};


http.get(options, function(res) {
    var body = '', title ='';
    
	console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));
    
    
	res.on('data', function (chunk) {
		body+=chunk;
		if (!title && /<title>.*<\/title>/im.test(body)){
			console.log('data arrived, testing...');
			title=body.match(/<title>(.*)<\/title>/im)[1];
		}
	});
	res.on('end', function(){
		console.log('title: '+unescape(title));
	});
	res.on('error', function(e) {
    	console.log("Got error: " + e.message);
    });
})