const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')
const { transformSync } = require('esbuild')

const compiled = { exports: {} }
const source = readFileSync(
  join(__dirname, '../src/apps/TopSQL/utils/instances.ts'),
  'utf8'
)
new Function(
  'module',
  'exports',
  transformSync(source, { loader: 'ts', format: 'cjs' }).code
)(compiled, compiled.exports)
const {
  resolveTopSQLInstance,
  isTopSQLInstanceAllowed,
  createLatestTopSQLInstanceRequest
} = compiled.exports
const tikv = { instance_type: 'tikv', instance: 'store-1' }
const tidb = { instance_type: 'tidb', instance: 'tidb-1' }
const physical = { allowedInstanceTypes: ['tikv'], requireListedInstance: true }

test('physical pages ignore previous TiDB URL and session selections', () => {
  assert.deepEqual(
    resolveTopSQLInstance([tidb, tikv], tidb.instance, 'tidb', tidb, physical),
    tikv
  )
  assert.deepEqual(resolveTopSQLInstance([tikv], '', '', tidb, physical), tikv)
  assert.equal(isTopSQLInstanceAllowed(tidb, physical), false)
  assert.equal(isTopSQLInstanceAllowed(tikv, physical), true)
})

test('target pages cannot manufacture instances from URL or stale session', () => {
  const stale = { instance_type: 'tikv', instance: 'removed-store' }
  assert.deepEqual(
    resolveTopSQLInstance([tikv], stale.instance, 'tikv', stale, physical),
    tikv
  )
  assert.equal(
    resolveTopSQLInstance([], tidb.instance, 'tidb', tidb, physical),
    null
  )
  assert.equal(
    resolveTopSQLInstance([], stale.instance, 'tikv', stale, physical),
    null
  )
  assert.equal(resolveTopSQLInstance([tidb], '', '', tidb, physical), null)
})

test('target logical pages retain TiDB/TiKV choices from their current catalog', () => {
  const options = { requireListedInstance: true }
  assert.deepEqual(
    resolveTopSQLInstance([tikv, tidb], tidb.instance, 'tidb', null, options),
    tidb
  )
  assert.deepEqual(
    resolveTopSQLInstance([tikv, tidb], '', '', tikv, options),
    tikv
  )
  assert.equal(
    resolveTopSQLInstance([], tidb.instance, 'tidb', tidb, options),
    null
  )
})

test('legacy pages keep existing URL/session fallback behavior', () => {
  assert.deepEqual(resolveTopSQLInstance([], tidb.instance, 'tidb', null), tidb)
  assert.deepEqual(resolveTopSQLInstance([], '', '', tikv), tikv)
  assert.deepEqual(resolveTopSQLInstance([tikv, tidb], '', '', null), tikv)
})

function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

test('late old catalog cannot override the current catalog or trigger URL normalization', async () => {
  const run = createLatestTopSQLInstanceRequest()
  const old = deferred()
  const latest = deferred()
  const applied = []
  const settled = []
  const oldRequest = run(
    () => old.promise,
    (rows) => applied.push(rows),
    () => settled.push('old')
  )
  const latestRequest = run(
    () => latest.promise,
    (rows) => applied.push(rows),
    () => settled.push('latest')
  )
  latest.resolve([tikv])
  assert.deepEqual(await latestRequest, [tikv])
  old.resolve([tidb])
  assert.equal(await oldRequest, null)
  assert.deepEqual(applied, [[tikv]])
  assert.deepEqual(settled, ['latest'])
})

test('older catalog cannot stop loading while a newer catalog is pending', async () => {
  const run = createLatestTopSQLInstanceRequest()
  const old = deferred()
  const latest = deferred()
  let settled = 0
  const applied = []
  const oldRequest = run(
    () => old.promise,
    (rows) => applied.push(rows),
    () => settled++
  )
  const latestRequest = run(
    () => latest.promise,
    (rows) => applied.push(rows),
    () => settled++
  )
  old.resolve([tidb])
  assert.equal(await oldRequest, null)
  assert.equal(settled, 0)
  assert.deepEqual(applied, [])
  latest.resolve([tikv])
  assert.deepEqual(await latestRequest, [tikv])
  assert.equal(settled, 1)
  assert.deepEqual(applied, [[tikv]])
})

test('a failed latest catalog does not revive an obsolete response', async () => {
  const run = createLatestTopSQLInstanceRequest()
  const old = deferred()
  const latest = deferred()
  const applied = []
  let settled = 0
  const oldRequest = run(
    () => old.promise,
    (rows) => applied.push(rows),
    () => settled++
  )
  const latestRequest = run(
    () => latest.promise,
    (rows) => applied.push(rows),
    () => settled++
  )
  latest.reject(new Error('catalog unavailable'))
  await assert.rejects(latestRequest, /catalog unavailable/)
  old.resolve([tidb])
  assert.equal(await oldRequest, null)
  assert.deepEqual(applied, [])
  assert.equal(settled, 1)
})
