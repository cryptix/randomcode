// pseudoclassical Inheritance


// Just crazy

function Gizmo(id) {
  this.id = id;
}

Gizmo.prototype.toString = function () {
  return "gizmo " + this.id;
};

function Hoozit(id) {
  this.id = id;
}

Hoozit.prototype = new Gizmo();
Hoozit.prototype.test = function (id) {
  return this.id === id;
};
