function y(cb) {
	var anon1 = function (f) {
		return cb(function (x) {
			return f(f)(x);
		});
	
	};

	return (function (f) {
		return f(f);
	}(anon1));
}

var factorial = y(function (fac) {
	return function (n) {
		return n <= 2 ? n : n * fac(n-1);
	};
});

for (var i = 1; i < 10; i++) {
	console.log(i + ": " + factorial(i));
}

