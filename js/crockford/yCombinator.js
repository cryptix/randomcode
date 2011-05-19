function y(le) {
	return (function (f) {
		return f(f);
	}(function (f) {
		return le(function (x) {
			return f(f)(x);
		})
	}));
};

var factorial = y(function (fac) {
	return function (n) {
		return n <= 2 ? n : n * fac(n-1);
	};
});

var num120 = factorial(5);
