function Stuff() {
	this.contents = "stuff";
	this.printContents = function() {
		console.log(this.contents);
	};
}

var s = new Stuff();
s.printContents();

var f1 = s.printContents;
f1();

var f2 = function() { s.printContents(); };
f2();
