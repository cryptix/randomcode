// ES3
function sumES3() {
  var i,
      n = arguments.length,
      total = 0;

  for(i = 0; i < n; i += 1) {
    total += arguments[i];
  }

  return total;
}

// ES5
function sumES5() {
  return arguments.reduce(function(a,b) { return a + b; }, 0);
}

var ten = sumES5(1,2,3,4);
console.log(ten);
