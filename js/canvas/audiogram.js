var Audiogram = Spine.Controller.create({
  events: {
    'mousemove ': 'onMouseMove'
  },

  init: function () {
    if (!this.el[0].getContext) { return alert('no contxt'); }
    this.ctx = this.el[0].getContext('2d');

    // plot variables
    var opt = this.options = {
      lines: 14,
      step: 28,
      boxWidth: this.el.width(),
      boxHeight: this.el.height(),
      plotXoff: 75.5,
      plotYoff: 80.5,
    };
    opt.plotWidth  = opt.step * (opt.lines-2),
    opt.plotHeight = opt.step * opt.lines

    // set up events
    $(document).keydown(this.onKeyDown.bind(this));
    $(document).keyup(this.onKeyUp.bind(this));
//    $(document).keypress(this.onKeyPress.bind(this));


    this.stepsHZ = ["125", 'TODO', "250", 'TODO', "500", "750", "1k", "1.5k", "2k", "3k", "4k", "6k", "8k"];
    this.stepsHL = [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130];

    this.buildJumps();

    this.curHZ  = 4; // array indices
    this.curHL  = 1;
    this.curPos = this.jumps [this.stepsHZ[this.curHZ]] [this.stepsHL[this.curHL]];


    this.drawBlank();
    this.drawCursor();


    this.active = false;
  },

  onMouseMove: function (evt) {
    if ( evt.offsetX > this.options.plotXoff
      && evt.offsetX < (this.options.plotXoff + this.options.plotWidth)
      && evt.offsetY > this.options.plotYoff
      && evt.offsetY < (this.options.plotYoff + this.options.plotHeight))
    {
      this.pos.css('font-weight', 'bold');
    } else {
      this.pos.css('font-weight', 'normal' );
    }
    this.pos.text('x: ' + evt.offsetX + ' y: ' + evt.offsetY);
  },

  onKeyDown: function (evt) {
    var nxt;
    if(!this.active) return;
    switch(evt.keyCode) {
      case 37: // left
        console.log('left');
        if (nxt = this.stepsHZ[this.curHZ - 1]) {
          if(nxt === 'TODO') {
            this.curHZ -= 2;
          } else {
            this.curHZ -= 1;
          }
        }
        break;
      case 39: // right
        console.log('right');
        if (nxt = this.stepsHZ[this.curHZ + 1]) {
          if(nxt === 'TODO') {
            this.curHZ += 2;
          } else {
            this.curHZ += 1;
          }
        }
        break;
      case 38: // up
        console.log('up');
        if (typeof this.stepsHL[this.curHL - 1] !== 'undefined') {
          this.curHL -= 1;
        }
        break;
      case 40: // down
        console.log('down');
        if (typeof this.stepsHL[this.curHL + 1] !== 'undefined') {
          this.curHL += 1;
        }
        break;
    }

    this.curPos = this.jumps [this.stepsHZ[this.curHZ]] [this.stepsHL[this.curHL]];
    this.drawBlank();
    this.drawCursor();
  },

  onKeyUp: function (evt) {
    if(!this.active) return;
    console.log('up');
  },

  // pre determain cursor jump positions
  buildJumps: function () {
    var opt = this.options;
    var x, y, sub, arr = {};

    var hz = this.stepsHZ;
    // hz
    for(var i = 0;i < opt.lines - 1; i += 1 ) {
      if (i == 1 || i == 3) continue;
      x = opt.plotXoff + opt.step * i;

      // hloss
      sub = {};
      for(var j = 0, hl = -10; j <= opt.lines; j += 1, hl += 10) {
        y = opt.plotYoff + opt.step * j;

        sub[hl] = [x,y];
      }
      arr[hz[i]] = sub;

    }
    this.jumps = arr;
  },

  drawBlank: function () {
    var ctx = this.ctx;
    var opt = this.options;

    // blank previous
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0, opt.boxWidth, opt.boxHeight);
    ctx.fillStyle = '#000';


    // text
    ctx.font = '14pt Arial';
    ctx.fillText(this.strings.title, opt.boxWidth/2-20, 20);
    ctx.font = '12pt Arial';
    ctx.fillText('Frequenz [Hz]', opt.boxWidth/2-50, 40);
    // rotate
    ctx.save()
    ctx.translate(25,opt.boxHeight/2+50);
    ctx.rotate(-Math.PI/2);
    ctx.fillText('Hörverlust [HL]', 0, 0);
    ctx.restore();

    // X Axis
    ctx.save();
    ctx.beginPath();
    ctx.textAlign = 'left';
    ctx.font = '8pt Thahoma, mono';
    var hz = ['8k', '6k', '4k', '3k', '2k',
        '1.5k', '1k', '750', '500', '250', '125'];
    for(var i = 0; i < opt.lines-1; i += 1 ) {
      if (i == 1 || i == 3) continue;
      var x = opt.plotXoff + opt.step * i;
      ctx.moveTo(x, opt.plotYoff);
      ctx.lineTo(x, opt.plotHeight + opt.plotYoff);
      //axis descr
      ctx.save();
      ctx.translate(x, opt.plotYoff);
      ctx.rotate(-Math.PI/4);
      ctx.fillText(hz.pop(), 5, -1 , 50);
      ctx.restore();
    }

    // Y Axis
    ctx.textAlign = 'end';
    for(var i = 0, hl = -10; i <= opt.lines; i += 1, hl += 10) {
      var y = opt.plotYoff + opt.step * i;
      ctx.moveTo(opt.plotXoff, y);
      ctx.lineTo(opt.plotWidth + opt.plotXoff, y);
      //axis descr
      ctx.fillText(hl, opt.plotXoff - 5,  y + 2, 20);
    }
    ctx.stroke();
    ctx.restore();
  },

  drawCursor: function () {
    var ctx = this.ctx
      , l = 4
      , x = this.curPos[0]
      , y = this.curPos[1];

    ctx.save();

    ctx.beginPath()
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    ctx.moveTo(x+l,y+l);
    ctx.lineTo(x-l,y-l);
    ctx.moveTo(x-l,y+l);
    ctx.lineTo(x+l,y-l);
    ctx.stroke();

    ctx.restore();
  }
});

var ag1, ag2;
$(document).ready(function() {
  ag1 = Audiogram.init({
    el: $('#audio1'),
    pos: $('#pos1'),
    strings: {
      'title': 'Links',
    }
  });

  ag2 = Audiogram.init({
    el: $('#audio2'),
    pos: $('#pos2'),
    strings: {
      'title': 'Rechts'
    }
  });
});
