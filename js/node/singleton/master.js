var master = 0;

module.exports.inc = function () { master += 3 };

module.exports.out = function () { return master; };
