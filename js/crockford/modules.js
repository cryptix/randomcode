var singleton = (function () {
    var privateVariable;
    function privateFunction(x) {
      // ... privateVariable ...
    }

    return {
      firstMethod: function (a, b) {
        // ... privateVariable
      },
      secondMethod: function(c) {
        // ... privateFunction()
      }
    };
}());
