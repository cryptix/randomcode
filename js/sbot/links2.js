var ssbClient = require('ssb-client')

ssbClient(function (err, sbot) {
  if (err) throw err

  var links2 = require('ssb-links').init(sbot, {path: '~/.ssb'})
  links2.read({query: [{$filter: {rel: ['mentions', {$prefix: '@d'}]}}]})
})

