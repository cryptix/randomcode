var jsdom = require('jsdom');

jsdom.env('<p><a class="the-link" href="http://jsdom.org>JSDOM\'s Homepage</a></p>',
    ['http://code.jquery.com/jquery-1.6.min.js'],
    function(err, window) {
        console.log('contents of a.the-link ', window.$('a.the-link').text());
    }
);