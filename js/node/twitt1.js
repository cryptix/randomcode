var Twit = require('twit');


var T = new Twit({
	consumer_key: "AWqWTUfJ57KyGw6dW063A",
	consumer_secret: "HRPXtBlRZOKMB6A9TZ3dxQx0H4XdaQgwmKyfGBP4",
	access_token: "36322255-xX20Hup42E4S9Jjp9s49oXh4HqMZ31bFipgrqsG0S",
	access_token_secret: "uu8JL1nPHWdcarQL8zGK4VbSLZb5c49QTnBrt8Lv4tE"
});


var stream = T.stream('user');
console.log("<TwiTT1> Stream Connected.");

stream.on('tweet', function(t) {
	console.log("<" + t.user.screen_name + "> " + t.text);
});