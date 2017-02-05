var cache = require('../lib/cache')
var npmlog = require('npmlog')
var test = require('tap').test
var testDir = require('./util/test-dir')
var tnock = require('./util/tnock')

var CACHE = testDir(__filename)
var manifest = require('../manifest')

var PKG = {
  name: 'foo',
  version: '1.2.3'
}
var META = {
  'dist-tags': {
    latest: '1.2.3'
  },
  versions: {
    '1.2.3': PKG
  }
}

npmlog.level = process.env.LOGLEVEL || 'silent'
var OPTS = {
  cache: CACHE,
  registry: 'https://mock.reg',
  log: npmlog,
  retry: {
    retries: 1,
    factor: 1,
    minTimeout: 1,
    maxTimeout: 10
  },
  metadata: {
    etag: 'my-etage',
    lastModified: 'my-lastmodified',
    time: +(new Date())
  }
}

test('memoizes identical registry requests', function (t) {
  t.plan(2)
  var srv = tnock(t, OPTS.registry)

  srv.get('/foo').once().reply(200, META)
  manifest('foo@1.2.3', OPTS, function (err, pkg) {
    if (err) { throw err }
    t.deepEqual(pkg, PKG, 'got a manifest')
    testDir.reset(CACHE)
    manifest('foo@1.2.3', OPTS, function (err, pkg) {
      if (err) { throw err }
      t.deepEqual(pkg, PKG, 'got a manifest')
    })
  })
})

test('tag requests memoize versions', function (t) {
  t.plan(2)
  var srv = tnock(t, OPTS.registry)

  srv.get('/foo').once().reply(200, META)
  manifest('foo@latest', OPTS, function (err, pkg) {
    if (err) { throw err }
    t.deepEqual(pkg, PKG, 'got a manifest')
    testDir.reset(CACHE)
    manifest('foo@1.2.3', OPTS, function (err, pkg) {
      if (err) { throw err }
      t.deepEqual(pkg, PKG, 'got a manifest')
    })
  })
})

test('tag requests memoize tags', function (t) {
  t.plan(2)
  var srv = tnock(t, OPTS.registry)

  srv.get('/foo').once().reply(200, META)
  manifest('foo@latest', OPTS, function (err, pkg) {
    if (err) { throw err }
    t.deepEqual(pkg, PKG, 'got a manifest')
    testDir.reset(CACHE)
    manifest('foo@latest', OPTS, function (err, pkg) {
      if (err) { throw err }
      t.deepEqual(pkg, PKG, 'got a manifest')
    })
  })
})

test('memoization is scoped to a given cache')

test('inflights concurrent requests', function (t) {
  t.plan(2)
  var srv = tnock(t, OPTS.registry)

  srv.get('/foo').once().reply(200, META)
  manifest('foo@1.2.3', OPTS, function (err, pkg) {
    if (err) { throw err }
    t.deepEqual(pkg, PKG, 'got a manifest')
  })

  manifest('foo@1.2.3', OPTS, function (err, pkg) {
    if (err) { throw err }
    t.deepEqual(pkg, PKG, 'got a manifest')
  })
})

test('supports fetching from an optional cache', function (t) {
  tnock(t, OPTS.registry)
  var key = cache.key('registry-request', OPTS.registry + '/foo')
  cache.put(CACHE, key, JSON.stringify(META), OPTS, function (err) {
    if (err) { throw err }
    manifest('foo@1.2.3', OPTS, function (err, pkg) {
      if (err) { throw err }
      t.deepEqual(pkg, PKG)
      t.end()
    })
  })
})

test('expires stale request data')
test('allows forcing use of cache when data stale')
test('falls back to registry if cache entry is invalid JSON')
// This test should prevent future footgunning if the caching logic changes
// accidentally. Caching manifests themselves should be entirely the job of the
// package fetcher.
test('does not insert plain manifests into the cache')

test('falls back to registry if cache entry missing', function (t) {
  var opts = {
    registry: OPTS.registry,
    log: OPTS.log,
    retry: OPTS.retry,
    cache: CACHE
  }
  var srv = tnock(t, opts.registry)
  srv.get('/foo').reply(200, META)
  manifest('foo@1.2.3', opts, function (err, pkg) {
    if (err) { throw err }
    t.deepEqual(pkg, PKG)
    t.end()
  })
})
