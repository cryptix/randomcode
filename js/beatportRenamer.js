var http = require('http'),
	fs = require('fs'),
	Step = require('step');

// Make request to the json api
// callback once response ends and json is parsed from resp.
function beatportApi(url, next) {
	var baseQry = {
		host: 'api.beatport.com',
		port: 80,
		path: url
	};
	http.get(baseQry, function(res){
		if(res.statusCode === 200) {
			var chunks = '';
			res.on('data', function(chunk) {
				chunks += chunk;
			});
			res.on('end', function(chunk){
		        if(typeof chunk !== 'undefined') chunks += chunk;
				next(null, JSON.parse(chunks));
			});
		} else {
			console.log('response code != 200');
			next(res.statusCode, null);
		}
	});
}

// ask for a lot of track ids at once
function getTrackInfos(ids, next) {
	var url = '/catalog/3/tracks?perPage=' + ids.length;
	url += '&ids=' + ids.join(',');
	beatportApi(url, function(err, json) {
		if (err) throw err;
		if(ids.length != json.results.length) {
			console.error('Missing results. req:' + ids.length + ' res: ' + json.results.length);
		}
		var info = [];
		json.results.forEach(function(res) {
			// remove entries from ids to find missing.. why u no work?!
			//ids.splice(ids.indexOf(res.id),1);
			info.push({
				trackId: res.id,
				title: res.title,
				labelName: res.label.name,
				releaseId: res.release.id
			});
		});
		next(null, info);		
	});
}

// ask for a label by id
function getReleaselInfo(id, next) {
	var url = '/catalog/3/release?id=' + id;
	beatportApi(url, function(err, json) {
		if (err) throw err;
		if (json.results.length != 1) {
			console.dir(json.results[0]);
		} else {
			next('no result for ' + id, null);
		}
	});
}

var resultsPerReq = 25;

Step(
	function readDir() {
		fs.readdir('/Users/cryptix/Music/Beatport', this);
	},
	function getIDsFromFnames(err, files) {
		if (err) throw err;
		// only use .mp3 files
		var mp3s = files.filter(function (fname) {
			return /\.mp3$/.test(fname); 
		});
		// extract the beatport id from the filename.
		return mp3s.map(function fname(fname) {
			return fname.split('_')[0];
		});
	},
	function requestTrackInfos(err, ids) {
		if (err) throw err;
		var group = this.group();
		while(ids.length > 0) {
			console.error('number of ids: ' + ids.length);
			getTrackInfos(ids.splice(0, resultsPerReq), group());
		}
	},
	function repackResult(err, groupd) {
		var infos = [];
		groupd.forEach(function (g) {
			g.forEach(function (tinfo) {
				infos.push(tinfo);
			});
		});
		return infos;
	}
);