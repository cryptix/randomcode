var fs = require('fs'),
    jsdom = require('jsdom');

jsdom.env('contexts.html', [
    'http://code.jquery.com/jquery-1.5.min.js',
    require('weld').filepath
  ], function(errors, window) {
    console.dir(errors);

    var data = [{ name: 'hij1nx',  title : 'code slayer' },
                { name: 'tmpvar', title : 'code pimp' }];

    window.weld(window.$('.contact')[0], data);

    console.dir(window.$('.contacts').html());
  }
);
