const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

const source = fs.readFileSync(
  path.join(__dirname, '../src/apps/TopSQL/utils/orderBy.ts'),
  'utf8'
)
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
})
const moduleExports = {}
vm.runInNewContext(outputText, { exports: moduleExports })
const resolve = (cfg, type) =>
  JSON.parse(
    JSON.stringify(moduleExports.resolveTopSQLOrderByConfig(cfg, type))
  )
const detailed = ['logical_read', 'logical_write', 'rocksdb_block_read']

test('TiDB retains its existing selector and permissions when detailed IO is forced', () => {
  for (const showOrderBy of [true, false, undefined]) {
    for (const allowedOrderBy of [undefined, ['cpu'], ['cpu', 'network']]) {
      const cfg = { showOrderBy, allowedOrderBy }
      assert.deepEqual(
        resolve({ ...cfg, showDetailedIoDimensions: true }, 'tidb'),
        resolve(cfg, 'tidb')
      )
    }
  }
})

test('NextGen TiKV adds all detailed dimensions while retaining CPU and Network', () => {
  assert.deepEqual(
    resolve(
      {
        showOrderBy: true,
        allowedOrderBy: ['cpu', 'network'],
        showDetailedIoDimensions: true
      },
      'tikv'
    ),
    { showOrderBy: true, allowedOrderBy: ['cpu', 'network', ...detailed] }
  )
})

test('a newly opened TiKV selector does not grant Network permission', () => {
  for (const showOrderBy of [false, undefined]) {
    assert.deepEqual(
      resolve({ showOrderBy, showDetailedIoDimensions: true }, 'tikv'),
      { showOrderBy: true, allowedOrderBy: ['cpu', ...detailed] }
    )
  }
})

test('a CPU-only NextGen allowlist retains its Network restriction', () => {
  assert.deepEqual(
    resolve(
      {
        showOrderBy: true,
        allowedOrderBy: ['cpu'],
        showDetailedIoDimensions: true
      },
      'tikv'
    ),
    { showOrderBy: true, allowedOrderBy: ['cpu', ...detailed] }
  )
})

test('existing unrestricted Dedicated permissions remain unrestricted', () => {
  assert.deepEqual(
    resolve({ showOrderBy: true, showDetailedIoDimensions: true }, 'tikv'),
    { showOrderBy: true }
  )
})

test('automatic or disabled detailed IO does not override parent permissions', () => {
  for (const showDetailedIoDimensions of [undefined, false]) {
    const cfg = {
      showOrderBy: false,
      allowedOrderBy: ['cpu'],
      showDetailedIoDimensions
    }
    assert.deepEqual(resolve(cfg, 'tikv'), {
      showOrderBy: false,
      allowedOrderBy: ['cpu']
    })
  }
})

test('an unresolved instance cannot open a detailed-only selector', () => {
  assert.deepEqual(
    resolve({ showOrderBy: false, showDetailedIoDimensions: true }, undefined),
    { showOrderBy: false }
  )
})

test('switching from TiKV to TiDB does not mutate the shared allowlist', () => {
  const cfg = {
    showOrderBy: true,
    allowedOrderBy: ['cpu', 'network'],
    showDetailedIoDimensions: true
  }
  const tikv = resolve(cfg, 'tikv')
  assert.ok(tikv.allowedOrderBy.includes('logical_read'))
  assert.deepEqual(cfg.allowedOrderBy, ['cpu', 'network'])
  assert.deepEqual(resolve(cfg, 'tidb'), {
    showOrderBy: true,
    allowedOrderBy: ['cpu', 'network']
  })
})
