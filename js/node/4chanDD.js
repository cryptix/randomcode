var fs = require('fs'),
    path = require('path'),
    http=require('http'),
    url=require('url'),
    jsdom = require('jsdom');

var boardUrl=process.argv.length>2 ? process.argv[2] : 'http://boards.4chan.org/w/res/1230239',
    threadNum = path.basename(boardUrl);
//console.dir(u);
//console.dir(options);

fs.mkdir(threadNum, '0700', function(err) {
   if(!err) console.log('Created:', threadNum);
});


jsdom.env(boardUrl,
  ['http://code.jquery.com/jquery-1.5.min.js'],
  function(err, window) {
    var $ = window.$;
    var reg = new RegExp(/images\.4chan\.org/);
    
    $('.filesize > a').each(function() {
      var lnk = $(this).attr('href');
      
      if(reg.test(lnk)) {
        var fname = path.basename(lnk);
        var u = url.parse(lnk);
        var opt = {host: u.host, port: u.port||80, path: u.pathname||'/'};
        
        http.get(opt,function(res) {
          var file = fs.createWriteStream(path.join(threadNum,fname));
          
          if(res.statusCode === 200) {
            res.pipe(file);
          }
          
          res.on('end', function() {
             console.log('saved:',file.path); 
          });
          
          res.on('error', function(e) {
            console.log("Got error: " + e.message);
          });
        });
      }
    });
  }
);
