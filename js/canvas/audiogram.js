if (!Function.prototype.bind) { (function () { var slice = Array.prototype.slice; Function.prototype.bind = function (thisObj) { var target = this; if (arguments.length > 1) { var args = slice.call(arguments, 1); return function () { var allArgs = args; if (arguments.length > 0) { allArgs = args.concat(slice.call(arguments)); } return target.apply(thisObj, allArgs); }; } return function () { if (arguments.length > 0) { return target.apply(thisObj, arguments); } return target.call(thisObj); }; }; }()); } 

var Audiogram = Spine.Controller.create({
  events: {
    'mousemove ': 'onMouseMove',
    'click': 'toggle'
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
    //$(document).keyup(this.onKeyUp.bind(this));
    //$(document).keypress(this.onKeyPress.bind(this));

    // jump points
    this.stepsHZ = ["125", 'TODO', "250", 'TODO', "500", "750", "1k", "1.5k", "2k", "3k", "4k", "6k", "8k"];
    this.stepsHL = [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130];
    this.buildJumps();
    this.curHZ  = 4; // array indices
    this.curHL  = 1;
    this.curPos = this.jumps [this.stepsHZ[this.curHZ]] [this.stepsHL[this.curHL]];

    this.active = false;
    this.draw();
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

  toggle: function (evt) {
    this.active = !this.active;
    this.draw();
  },

  onKeyDown: function (evt) {
    var nxt;
    if(this.active) {
      switch(evt.keyCode) {

        case 37: // left
          if (nxt = this.stepsHZ[this.curHZ - 1]) {
            if(nxt === 'TODO') {
              this.curHZ -= 2;
            } else {
              this.curHZ -= 1;
            }
          }
          break;

        case 39: // right
          if (nxt = this.stepsHZ[this.curHZ + 1]) {
            if(nxt === 'TODO') {
              this.curHZ += 2;
            } else {
              this.curHZ += 1;
            }
          }
          break;

        case 38: // up
          if (typeof this.stepsHL[this.curHL - 1] !== 'undefined') {
            this.curHL -= 1;
          }
          break;

        case 40: // down
          if (typeof this.stepsHL[this.curHL + 1] !== 'undefined') {
            this.curHL += 1;
          }
          break;
      }
    }

    this.curPos = this.jumps [this.stepsHZ[this.curHZ]] [this.stepsHL[this.curHL]];
    this.draw();
  },

  onKeyUp: function (evt) {
    if(!this.active) return;
    console.log('up');
  },

  // pre determain cursor jump positions
  buildJumps: function () {
    var opt = this.options;
    var x, y, sub, arr = {};

    // TODO: rewrite to use step arr?
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

  draw: function () {
    this.drawBlank();
    if(this.active) this.drawCursor();
  },

  drawBlank: function () {
    var ctx = this.ctx;
    var opt = this.options;

    // blank previous
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0, opt.boxWidth, opt.boxHeight);
    ctx.fillStyle = '#000';

    // bg fade
    ctx.save();
    var fade = ctx.createLinearGradient(opt.boxWidth, 0, opt.boxWidth, opt.boxHeight);
    fade.addColorStop(0, "#fff");
    if (this.active) {
      fade.addColorStop(1, this.settings.color);
    } else {
      fade.addColorStop(1, '#333');
    }
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, opt.boxWidth, opt.boxHeight);
    ctx.fillStyle = '#fff';
    ctx.fillRect(opt.plotXoff, opt.plotYoff, opt.plotWidth, opt.plotHeight);
    ctx.restore();

    // text
    ctx.font = '14pt Arial';
    ctx.fillText(this.settings.title, opt.boxWidth/2-20, 20);
    ctx.font = '12pt Arial';
    ctx.fillText('Frequenz [Hz]', opt.boxWidth/2-50, 40);
    ctx.save() // rotate
    ctx.translate(25,opt.boxHeight/2+50);
    ctx.rotate(-Math.PI/2);
    ctx.fillText('Hörverlust [HL]', 0, 0);
    ctx.restore();


    // X Axis
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth=1;
    ctx.textAlign = 'left';
    ctx.font = '10pt Thahoma, mono';
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

    // outline
    ctx.lineWidth = 2;
    ctx.strokeRect(opt.plotXoff, opt.plotYoff, opt.plotWidth, opt.plotHeight);

    ctx.restore();
  },

  drawCursor: function () {
    var ctx = this.ctx
      , l = 4
      , x = this.curPos[0]
      , y = this.curPos[1];

    ctx.beginPath()
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    ctx.moveTo(x+l,y+l);
    ctx.lineTo(x-l,y-l);
    ctx.moveTo(x-l,y+l);
    ctx.lineTo(x+l,y-l);
    ctx.stroke();
  }
});

var ag1, ag2;
$(document).ready(function() {
  ag1 = Audiogram.init({
    el: $('#audio1'),
    pos: $('#pos1'),
    settings: {
      'title': 'Links',
      'color': '#00f'
    }
  });
  ag2 = Audiogram.init({
    el: $('#audio2'),
    pos: $('#pos2'),
    settings: {
      'title': 'Rechts',
      'color': '#f00'
    }
  });
});
