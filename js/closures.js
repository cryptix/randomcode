function makeAdder() {
	var sum = 0;
	return function(n) {
		sum += n;
		return sum;
	};
}

var a1 = makeAdder();
var a2 = makeAdder();

console.log(a1(1));
console.log(a2(5));
console.log(a1(1));
console.log(a2(7));
console.log(a1(1));
