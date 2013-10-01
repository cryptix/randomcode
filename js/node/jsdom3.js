var jsdom = require('jsdom');

jsdom.env('http://news.ycombinator.com/',
    ['http://code.jquery.com/jquery-1.6.min.js'],
    function(err, window) {
        var $ = window.$;
        
        console.log('HN Links');
        $('td.title:not(:last) a').each(function() {
            console.log(' -', $(this).text());
        });
    }
);