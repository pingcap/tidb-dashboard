const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')
const { transformSync } = require('esbuild')

// Use the existing compiler and Node runner; no browser or test dependency.
const source = readFileSync(
  join(__dirname, '../src/apps/TopSQL/utils/response.ts'),
  'utf8'
)
const compiled = { exports: {} }
new Function(
  'module',
  'exports',
  transformSync(source, { loader: 'ts', format: 'cjs' }).code
)(compiled, compiled.exports)
const {
  normalizeTopSQLResponse,
  getTopSQLRecordKey,
  getResponseMetricTotal,
  buildResponseChartData
} = compiled.exports

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}

test('preserves server records, plan order, zero points and exact keyspace strings', () => {
  const source = freeze([
    {
      keyspace: '18446744073709551615',
      sql_digest: 'z',
      cpu_time_ms: 0,
      plans: [
        { plan_digest: 'z-plan', timestamp_sec: [10, 20], cpu_time_ms: [0, 1] },
        { plan_digest: 'a-plan', timestamp_sec: [10, 20], cpu_time_ms: [9, 0] }
      ]
    },
    { is_other: true, sql_digest: '', cpu_time_ms: 0, plans: [] },
    {
      keyspace: '18446744073709551614',
      sql_digest: 'a',
      cpu_time_ms: 100,
      plans: []
    }
  ])
  const rows = normalizeTopSQLResponse(source, 'tikv:store-1')
  assert.deepEqual(
    rows.map((row) => row.sql_digest),
    ['z', '', 'a']
  )
  assert.equal(rows[0].keyspace, '18446744073709551615')
  assert.deepEqual(
    rows[0].plans.map((plan) => plan.plan_digest),
    ['z-plan', 'a-plan']
  )
  assert.deepEqual(rows[0].plans[0].timestamp_sec, [10000, 20000])
  assert.deepEqual(rows[0].plans[0].cpu_time_ms, [0, 1])
  assert.deepEqual(source[0].plans[0].timestamp_sec, [10, 20])
  assert.equal(rows[1].is_other, true)
})

test('does not merge equal digests across keyspaces, duplicate records or instances', () => {
  const input = [
    {
      keyspace: '100',
      sql_digest: 'same',
      plans: [{ timestamp_sec: [1], network_bytes: [4] }]
    },
    {
      keyspace: '200',
      sql_digest: 'same',
      plans: [{ timestamp_sec: [1], network_bytes: [8] }]
    },
    {
      keyspace: '200',
      sql_digest: 'same',
      plans: [{ timestamp_sec: [1], network_bytes: [0] }]
    }
  ]
  const rows = normalizeTopSQLResponse(input, 'tikv:store-1')
  const keys = rows.map(getTopSQLRecordKey)
  assert.equal(new Set(keys).size, 3)
  const chart = buildResponseChartData(rows, 'network')
  assert.deepEqual(Object.keys(chart), keys)
  assert.deepEqual(Object.values(chart), [
    [[1000, 4]],
    [[1000, 8]],
    [[1000, 0]]
  ])
  assert.notEqual(
    getTopSQLRecordKey(normalizeTopSQLResponse(input, 'tikv:store-2')[0]),
    keys[0]
  )
  assert.notEqual(rows[0].plans[0].responseKey, rows[1].plans[0].responseKey)
})

test('prefers server totals including zero and falls back only when absent', () => {
  const row = {
    cpu_time_ms: 0,
    network_bytes: 100,
    plans: [{ cpu_time_ms: [20], network_bytes: [3] }]
  }
  assert.equal(getResponseMetricTotal(row, 'cpu'), 0)
  assert.equal(getResponseMetricTotal(row, 'network'), 100)
  assert.equal(getResponseMetricTotal({ plans: row.plans }, 'network'), 3)
  assert.equal(getResponseMetricTotal({}, 'cpu'), 0)
})

test('plots only plans of the same returned SQL record and keeps empty series', () => {
  const rows = normalizeTopSQLResponse(
    [
      {
        sql_digest: 'first',
        plans: [
          { timestamp_sec: [1, 2], cpu_time_ms: [1, 0] },
          { timestamp_sec: [1, 2], cpu_time_ms: [2, 0] }
        ]
      },
      { sql_digest: 'empty', plans: [] },
      {
        sql_digest: 'last',
        plans: [{ timestamp_sec: [1], cpu_time_ms: [100] }]
      }
    ],
    'tidb:server-1'
  )
  assert.deepEqual(Object.values(buildResponseChartData(rows, 'cpu')), [
    [
      [1000, 3],
      [2000, 0]
    ],
    [],
    [[1000, 100]]
  ])
})

test('retains all 100 server-ranked entries and Others without client Top N', () => {
  const input = Array.from({ length: 100 }, (_, index) => ({
    sql_digest: String(100 - index),
    cpu_time_ms: index,
    plans: []
  }))
  input.splice(50, 0, {
    is_other: true,
    sql_digest: '',
    cpu_time_ms: 0,
    plans: []
  })
  const rows = normalizeTopSQLResponse(input, 'tikv:store-1')
  assert.equal(rows.length, 101)
  assert.equal(Object.keys(buildResponseChartData(rows, 'cpu')).length, 101)
  assert.deepEqual(
    rows.map((row) => row.sql_digest),
    input.map((row) => row.sql_digest)
  )
  assert.equal(rows[50].is_other, true)
})

test('legacy records retain their existing selection identity', () => {
  assert.equal(getTopSQLRecordKey({ sql_digest: 'legacy' }), 'legacy')
  assert.equal(getTopSQLRecordKey({ text: 'table-name' }), 'table-name')
  assert.equal(getTopSQLRecordKey({ sql_digest: '', is_other: true }), '')
})

test('plan identity follows its digest when the backend changes plan order', () => {
  const normalizePlans = (plans) =>
    normalizeTopSQLResponse(
      [{ keyspace: '100', sql_digest: 'sql', plans }],
      'tikv:store-1'
    )[0].plans
  const first = normalizePlans([{ plan_digest: 'p1' }, { plan_digest: 'p2' }])
  const reordered = normalizePlans([
    { plan_digest: 'p2' },
    { plan_digest: 'p1' }
  ])
  assert.deepEqual(
    reordered.map((plan) => plan.plan_digest),
    ['p2', 'p1']
  )
  assert.equal(first[0].responseKey, reordered[1].responseKey)
  assert.equal(first[1].responseKey, reordered[0].responseKey)
  const repeated = normalizePlans([
    { plan_digest: 'p1' },
    { plan_digest: 'p1' },
    {},
    {}
  ])
  assert.equal(new Set(repeated.map((plan) => plan.responseKey)).size, 4)
})
