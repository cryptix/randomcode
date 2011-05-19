function gizmo(id) {
  return {
    id: id,
    toString: function () {
      return "gizmo " + this.id;
    }
  };
}

function hoozit(id) {
  var that = gizmo(id);
  that.test = function(testId) {
    return testId === this.id;
  };

  return that;
}

var g = gizmo(12);
var h = hoozit(31);

console.log(g.toString());
console.dir(g);
console.log(h.test(32));
console.dir(h);
