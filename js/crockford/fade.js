function fade(id) {
  var dom = document.getElementById(id),
      level = 1;

  function step() {
    var h = level.toString(16);
    dom.style.backgroundColor = '#00FF' + h + h;

    if(level < 15) {
      level += 1;
      setTimeout(step, 100);
    }
  }
  setTimeout(step, 100);
}
