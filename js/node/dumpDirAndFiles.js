var dir = process.ARGV[2];

if(!dir) return console.log("Usage: node " + process.ARGV[1] + " dirname");

var async = require('async'),
    step = require('step'),
    path = require('path'),
    fs = require('fs');

var tmpfiles = [];
step(
  function getFiles() {
    fs.readdir(dir, this);
  },
  function getFullPath(err, files) {
    if(err) throw err;

    async.map(files, function(item, cb) {
      cb(null, path.join(dir, item));
    }, this);
  },
  function statFiles(err, files) {
    tmpfiles = files;
    async.map(files, fs.lstat, this);
  },
  function mergeStatsWithNames(err, stats) {
    if(err) throw err;

    async.map(stats, function(item, cb) {
      var itemIndex = stats.indexOf(item);
      item.name = tmpfiles[itemIndex];
      cb(null,item);
    }, this);
  },
  function sliceDirsAndFiles(err, stats) {
    var files = [],
        dirs  = [],
        obj = {files: files, dirs: dirs};


    stats.forEach(function(item, index) {
        if(item.isFile() || item.isSymbolicLink()) {
          files.push(item);
        } else if(item.isDirectory()) {
          dirs.push(item);
        } else throw item;
    });
    return obj;
  },
  function printBoth(err, obj) {
    console.log("Files:")
    obj.files.forEach(function(item, index) {
        console.dir(item);
    });

    console.log("Dirs:")
    obj.dirs.forEach(function(item, index) {
        console.dir(item);
    });
  }
);
