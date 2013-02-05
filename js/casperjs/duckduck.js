casper.test.comment("DuckDuckGo - Homepage");

var search_term = "speed of an unladen swallow";

casper.start('http://duckduckgo.com', function() {
	this.test.assertTitle('DuckDuckGo', 'Homepage has the correct title');

	this.test.assertExists('#search_form_homepage', 'Main search box is available');

	casper.test.info('Populating search box with term: ' + search_term);

	this.fill('#search_form_homepage', {
		'q': search_term
	}, true);


	casper.test.info('Testing search...');
});

// after the form was submitted and results shown
casper.then(function () {
	this.test.assertEval(function () {
		return __utils__.findAll('div.results_links_deep').length > 10;
	}, 'Returned search results for query');
});

casper.run(function() {
	// confirm this test is done
	this.test.done();
});