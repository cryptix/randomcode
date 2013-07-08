var http = require('http')
  , fs   = require('fs');

function factorial(val) {
  var x = 1;
  while (val>1) {
    x *= val;
    val--;
  }
  return x;
}

/* Returns position or -1 of 'val' from 'lst[start]' to 'lst[stop]', exclusive. */
function ArrayFindVal(lst,begin,end,val) {
  var pos;

  for (pos=begin; pos<end; pos++) {
    if (lst[pos]==val) return pos;
  }
  return -1;
}

var inputWord = "olpoiniabtngr";
var nPermut = inputWord.length;
var nPos = 0;
var nPermut = factorial(inputWord.length);

var plainPath = '/ajax/services/search/web?v=1.0&q=club-mateasdd';
var qry ={
  host: 'ajax.googleapis.com',
  port: 80,
  path: plainPath
};



var usedChars = [];
function permute(input) {
  //convert input into a char array (one element for each character)
  var i, ch, chars = input.split("");
  for (i = 0; i < chars.length; i++) {
    //get and remove character at index "i" from char array
    ch = chars.splice(i, 1);
    //add removed character to the end of used characters
    usedChars.push(ch);
    //when there are no more characters left in char array to add, add used chars to list of permutations
    if (chars.length == 0) {
      //permArr[permArr.length] = usedChars.join("");
      console.log('look for ' + usedChars.join(""));
    }
    //send characters (minus the removed one from above) from char array to be permuted
    process.nextTick(function() {
      permute(chars.join(""));
    });
    //add removed character back into char array in original position
    chars.splice(i, 0, ch);
    //remove the last character used off the end of used characters array
    usedChars.pop();
  }
}

permute(inputWord);


http.get(qry, function processResponse(res) {
  console.log('Got Response: ' + res.statusCode);
  if(res.statusCode == 200) {
    var chunks = "";
    res.on('data', function (chunk) {
      chunks += chunk;
    });
    res.on('end', function (chunk) {
      if(typeof chunk !== 'undefined') chunks += chunk;
      var data = JSON.parse(chunks);
      debugger;
      console.log('%d - %s', data['responseData']['cursor']['estimatedResultCount'], 'asd')
    });
  }
}).on('error', function(e) {
  console.log('Query failed!' + e.message);
});