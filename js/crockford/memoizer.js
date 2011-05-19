function memoizer(memo, formula) {
	var recur = function(n) {
		var result = memo[n];
		if(typeof result !== 'number') {
			result = formula(recur, n);
			memo[n] = result;
		}
		return result;
	};
	return recur;
};

var factorial = memoizer([1, 1], function(recur, n) {
	return n * recur(n-1);
});

var fibonacci = memoizer([0, 1], function(recur, n) {
	return recur(n-1) + recur(n-2);
});