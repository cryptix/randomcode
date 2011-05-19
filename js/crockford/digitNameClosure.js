// slow.. reinit...
var digitName = (function() {
  var names = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

  return function (n) {
    return names[n];
  };

}());

console.log(digitName(3)); // 'three'
