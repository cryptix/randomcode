var getInt = function(str) {
	return parseInt( str.replace('.','') );
};

var notNaN = function(e) {
	return !isNaN(e);
};

var rep = $('.fleetinfo');
var lines = [];
for (var i = rep.length - 1; i >= 0; i--) {
	var rows = $(rep[i]).find('tr');
	var txt = rows
		.slice(rows.length-3,rows.length)
		.find('.value')
		.text()
		.split('\n')
		.map(getInt)
		.filter(notNaN)
		.join('\t');
	lines.push(txt);
}
window.prompt("Loot:", lines.join('\n'));
