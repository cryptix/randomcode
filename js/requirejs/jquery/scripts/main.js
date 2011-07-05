require(['jquery', 'helper/util'], function($, util) {
  require.ready(function() {
    var list = $('ol');

    // iterate over object
    var i = 1;
    $.each(util, function(key, val) {
      var li = $('<li></li>');

      li.attr('value', i++);
      li.text(key + ': ' + val);

      list.append(li);
    });

  });
});
