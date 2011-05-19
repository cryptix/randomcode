function makeSealer() {
  var boxes = [], values = [];

  return {
    sealer: function (value) {
      var i = boxes.length,
          box = {};
      boxes[i] = box;
      values[i] = value;
      return box;
    },
    unsealer: function (box) {
      return values[boxes.indexOf(box)];
    }
  };
}
