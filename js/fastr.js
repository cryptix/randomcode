var fastr = function(cb, opts) {
  var ctx, ids = [];

  function innerCB() {
    if(ctx.count >= 0 && ctx.timeout > 1e-400) {
      // timer context is available to the callback
      cb(ctx);

      ctx.count += ctx.steps;
      ctx.timeout *= ctx.factor;
      ctx.moar();
    } else ctx.stop();
  }

  ctx = {
    count: opts.count || 0,
    steps: opts.steps || 1,

    timeout: opts.timeout || 1000, 
    factor: opts.factor || 0.5,

    moar: function() {
      tid = setTimeout(innerCB, ctx.timeout);

      ids.push(tid); 
    },

    stop: function() {
      console.log('over 9000!!');
      ids.forEach(function(e) {
        clearTimeout(e);
      });
    }
  };

  return ctx;
};

(function main() {

 function doStuff(tCTX) {
  console.log(tCTX.count + ' ' + tCTX.timeout);
 }

 var timer = fastr(doStuff, { factor: 0.95 });

 timer.moar();

}());
