const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')
const { transformSync } = require('esbuild')

const source = readFileSync(join(__dirname, '../src/utils/csv.ts'), 'utf8')
const compiled = { exports: {} }
new Function(
  'module',
  'exports',
  transformSync(source, { loader: 'ts', format: 'cjs' }).code
)(compiled, compiled.exports)
const { serializeCSV } = compiled.exports

test('keeps SQL dates inside the query field when quotes and commas are present', () => {
  const digest = 'a'.repeat(64)
  const rows = [
    {
      query: 'SELECT "done", "2026-10-27 13:00:00"',
      digest,
      timestamp: 1793106000
    }
  ]

  assert.equal(
    serializeCSV(rows, [
      { label: 'query', key: 'query' },
      { label: 'digest', key: 'digest' },
      { label: 'timestamp', key: 'timestamp' }
    ]),
    '"query","digest","timestamp"\n' +
      '"SELECT ""done"", ""2026-10-27 13:00:00""",' +
      `"${digest}","1793106000"`
  )
})

test('escapes multiline values and headers while retaining empty and numeric cells', () => {
  assert.equal(
    serializeCSV(
      [{ query: 'SELECT "x"\nFROM t', count: 0, unused: null }],
      [
        { label: 'SQL "text"', key: 'query' },
        { label: 'count', key: 'count' },
        { label: 'unused', key: 'unused' }
      ]
    ),
    '"SQL ""text""","count","unused"\n' + '"SELECT ""x""\nFROM t","0",""'
  )
})
