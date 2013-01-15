var http = require('http');
var url = require('url');

var qobj = {
  protocol: 'http',
  host: 'duckduckgo.com',
  query: { 
    q: "my search string",
    o:"json",
    t: "tty",
    //callback: "search_callback",
    no_redirect: 1
  }
};

var req = http.get(url.format(qobj),function(res) {
    if (res.statusCode !== 200) { console.warn(res);  return; }

    console.log("STATUS: " + res.statusCode);
    console.log("HEADERS:");
    console.dir(res.headers);

    res.setEncoding("utf8");

    res.on('data', function(chunk) {
      //console.log("BODY:\n\n" + chunk);
      console.dir(JSON.parse(chunk));
    });
});


req.on('error', function(e) {
  console.log('problem with req: ' + e.message);
});




