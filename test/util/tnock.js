var nock = require('nock')
var clearMemoized = require('../../lib/cache')._clearMemoized

module.exports = tnock
function tnock (t, host) {
  clearMemoized()
  var server = nock(host)
  t.tearDown(function () {
    server.done()
  })
  return server
}
