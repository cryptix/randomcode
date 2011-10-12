var net = require('net');


var con = net.createConnection(9999, 'localhost');

con.on('connect', function() {
  con.write('S>1=2\rR>0x00000001\r');
});

var levelLeft = 0;
var levelRight = 0;

con.on('data', function(data) {
  data = data.toString().split('\r')[0];
  var cmd = data.split(' ')[0];
  var par = data.split(' ')[1];
  var ret = '';

  switch(cmd) {
    case '11': // freq
      ret = 'S>11=' + par;
      break;
    case '12': // level left
      levelLeft += Number(par);
      if(levelLeft > 1300) {
        levelLeft = 1300;
      } else if(levelLeft < -100) {
        levelLeft = -100;
      }
      ret = 'S>13=' + levelLeft;
      break;
    case '13': // level right
      levelRight += Number(par);
      if(levelRight > 1300) {
        levelRight = 1300;
      } else if(levelRight < -100) {
        levelRight = -100;
      }
      ret = 'S>12=' + levelRight;
      break;
    case '14':
      ret = 'S>1=' + par;
      break;
    case '15': // side
      ret = 'S>2=' + par;
      break;
    case '16': // modulation
      ret = 'S>3=' + par;
      break;
    case '19': // level lock
      ret = 'S>7=' + par;
      break;
    case '21': // set menu
      ret = 'S>15=' + par;
      break;
    case '84':
      ret += 'D>1\tMüller\tHeinz\t13.08.1965\t019283\r';
      ret += 'D>2\tBerger\tAndreas\t27.01.1985\t019284\r';
      ret += 'D>3\tPeters\tMartin\t01.02.1960\t019285\r';
      ret += 'D>4\tPeters\tIngrid\t26.11.1956\t019286\r';
      break;
  }

  console.log('cmd[%s] par[%s] ret[%s]', cmd, par, ret);

  ret += (cmd == 84) ? 'D>0\r' : '\rR>0x00000001\r';
  con.write(ret);
});
