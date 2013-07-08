var arr = $('.spy2 > tbody > tr > td')
	.map(function(i,e) {
		return parseInt(e.innerHTML.replace('.', ''), 10);
	});
var obj = {metal: arr[1], crystal: arr[3], deuterium: arr[5], energy: arr[7]};
console.dir(obj);