function gizmo(id) {
  return {
      name: 'gizmo ',
      toString: function() {
        return this.name + id;
      }
  }
}

function hoozit(id) {
  var that = gizmo(id);
  that.name = 'hoozit ';
  that.test = function (testId) {
    return testId === id;
  };

  return that;
};

var g = gizmo(12);
var h = hoozit(31);

console.log(g.toString());
console.dir(g);
console.log(h.test(32));
console.dir(h);
