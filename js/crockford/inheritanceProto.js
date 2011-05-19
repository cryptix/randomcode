function newConstructor(extend, initializer, methods) {
  var func, prototype = Object.create(extend && extend.prototype);

  if (methods) {
    // REWRITE
    //methods.keys().forEach(function(k) {
    for(var k in methods) {
      if(methods.hasOwnProperty(k)) {
        prototype[k] = methods[k];
      }
    }
  }
  func = function () {
    var that = Object.create(prototype);
    if (typeof initializer === 'function') {
      initializer.apply(that, arguments);
    }

    return that;
  };
  func.prototype = prototype;
  prototype.constructor = func;
  return func;
}

var gizmo = newConstructor(Object, function (id) {
    this.id = id;
    this.name = "Giz";
}, {
  toString: function () {
    return "gizmo " + this.id;
  }
});

var hoozit = newConstructor(gizmo, function (id) {
    this.id = id;
    this.name = "Hoz";
}, {
  test: function (id) {
    return this.id === id;
  }
});

var g = gizmo(12);
var h = hoozit(31);

console.log(g.toString());
console.dir(g);
console.log(h.test(32));
console.dir(h);
