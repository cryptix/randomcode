require(['helper/util'], function(util) {
  require.ready(function() {
    var list = document.querySelector('ol');

    // iterate over object
    Object.keys(util).forEach(function(el, i) {
      var li = document.createElement('li');

      li.setAttribute('value', i+1);
      li.innerHTML = el + ': ' + util[el];

      list.appendChild(li);
    });

  });
});
