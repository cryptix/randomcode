if (typeof Object.prototype.later !== 'function') {
  Object.prototype.later = function(msef, method) {
    var that = this,
        args = Array.prototype.slice.apply(arguments, [2]);

    if (typeof method === 'string') {
      method = that[method];
    }

    setTimeout(function() {
        method.apply(that, args);
    }, msec);

    return that; // Cascade
  };
}
