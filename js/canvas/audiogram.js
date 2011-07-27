$(document).ready(function() {
  var pos = $('#pos');
  var canvas = $('#audio');

  function onMouseMove(evt) {
    if ( evt.offsetX > boxXoff
      && evt.offsetX < (boxXoff + boxWidth)
      && evt.offsetY > boxYoff
      && evt.offsetY < (boxYoff + boxHeight))
    {
      pos.css('font-weight', 'bold');
    } else {
      pos.css('font-weight', 'normal' );
    }
    pos.text('x: ' + evt.offsetX + ' y: ' + evt.offsetY);
  }
  $(canvas).mousemove(onMouseMove);

  if (!canvas[0].getContext) { return alert('no contxt'); }
  var ctx = canvas[0].getContext('2d');

  // text
  ctx.font = '12pt Arial';
  ctx.fillText('Links', 140, 20);
  ctx.fillText('Frequenz [Hz]', 110, 40);
  // rotate
  //ctx.fillText('Hörverlust [HL]', 10, 210);

  var lines = 14;
  var step = 22;
  var boxXoff = 45.5;
  var boxYoff = 75.5;
  var boxWidth = step * (lines-2);
  var boxHeight = step * lines;
  ctx.beginPath();
  ctx.font = '6pt Thahoma, mono';

  // X Axis
  ctx.textAlign = 'left';
  var hz = ['8k', '6k', '4k', '3k', '2k',
      '1.5k', '1k', '750', '500', '250', '125'];
  for(var i = 0; i < lines-1; i += 1 ) {
    if (i == 1 || i == 3) continue;
    var x = boxXoff + step * i;
    ctx.moveTo(x, boxYoff);
    ctx.lineTo(x, boxHeight + boxYoff);
    //axis descr
    ctx.fillText(hz.pop(), x, boxYoff - 5 , 50);
  }

  // Y Axis
  ctx.textAlign = 'end';
  for(var i = 0, hl = -10; i <= lines; i += 1, hl += 10) {
    var y = boxYoff + step * i;
    ctx.moveTo(boxXoff, y);
    ctx.lineTo(boxWidth + boxXoff, y);
    //axis descr
    ctx.fillText(hl, boxXoff - 5,  y + 2, 20);
  }
  ctx.stroke();
});
