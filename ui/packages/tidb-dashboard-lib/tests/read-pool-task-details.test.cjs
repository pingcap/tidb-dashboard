// Copyright 2026 PingCAP, Inc.

const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')
const { transformSync } = require('esbuild')

// Follow the existing Node tests without adding a test dependency.
const source = readFileSync(
  join(__dirname, '../src/apps/SlowQuery/pages/Detail/readPoolTaskDetails.ts'),
  'utf8'
)
const compiled = { exports: {} }
new Function(
  'module',
  'exports',
  transformSync(source, { loader: 'ts', format: 'cjs' }).code
)(compiled, compiled.exports)
const { parseReadPoolTaskDetails: parse } = compiled.exports

test('preserves JSON strings and already-decoded aggregate objects', () => {
  const details = {
    tasks: 3,
    fair_queue: { enabled: true },
    poll_count: { total: 6, avg: 2, max: 3, min: 1 },
    dispatch_count: { total: 3 },
    task_wall_time: { total: '3ms' },
    queue_wait: { total: '1ms' },
    wake_wait: { total: '1ms' },
    poll_cpu: { total: '1ms' },
    poll_wall: { total: '2ms' }
  }
  assert.deepEqual(parse(JSON.stringify(details)), details)
  assert.deepEqual(parse(details), details)
})

test('parses TiDB compact logs without recomputing aggregate statistics', () => {
  const details = parse(
    '{tasks:1, poll_count:{total:50, avg:50, max:50, min:50}, ' +
      'dispatch_count:{total:1, max:1, min:1}, ' +
      'task_wall_time:{total:54.4ms, avg:54.4ms, max:54.4ms, min:54.4ms}, ' +
      'queue_wait:{total:16.3µs}, fair_queue:{enabled:true, ' +
      'waited_task_slices:{total:0, max:0, min:0}}, ' +
      'poll_cpu:{total:54.2ms}, poll_wall:{total:54.3ms}}'
  )
  assert.equal(details.tasks, 1)
  assert.deepEqual(details.poll_count, { total: 50, avg: 50, max: 50, min: 50 })
  assert.deepEqual(details.dispatch_count, { total: 1, max: 1, min: 1 })
  assert.equal(details.task_wall_time.total, '54.4ms')
  assert.equal(details.queue_wait.total, '16.3µs')
  assert.equal(details.fair_queue.waited_task_slices.total, 0)
  assert.equal(details.poll_cpu.total, '54.2ms')
  assert.equal(details.poll_wall.total, '54.3ms')
  assert.equal(details.wake_wait, undefined)
})

test('preserves composite durations and supported microsecond spellings', () => {
  for (const duration of ['1m2.3s', '10ns', '16.3µs', '16.3μs', '16.3us']) {
    const details = parse(`{tasks:1, task_wall_time:{total:${duration}}}`)
    assert.equal(details.task_wall_time.total, duration)
  }
})

test('preserves zero statistics and disabled fair scheduling', () => {
  const details = {
    tasks: 0,
    fair_queue: { enabled: false },
    poll_count: { total: 0, avg: 0, max: 0, min: 0 },
    task_wall_time: { total: '0s' }
  }
  assert.deepEqual(parse(JSON.stringify(details)), details)
})

test('keeps absent metrics absent for counter-only records', () => {
  assert.deepEqual(parse('{tasks:1, poll_count:{total:2}}'), {
    tasks: 1,
    poll_count: { total: 2 }
  })
})

test('ignores missing, malformed and unsafe values without throwing', () => {
  const invalid = [
    null,
    undefined,
    '',
    'null',
    '{}',
    '[]',
    '42',
    '"x"',
    '{"tasks":',
    '{"tasks":{}}',
    '{"poll_count":{"total":{}}}',
    '{"poll_count":{"total":[]}}',
    '{"fair_queue":{"enabled":"true"}}',
    '{tasks:1, poll_count:{total:NaN}}',
    '{tasks:1, wake_wait:{total:broken}}',
    { tasks: Number.NaN },
    { tasks: 1, poll_count: { total: Number.POSITIVE_INFINITY } }
  ]
  for (const value of invalid) assert.equal(parse(value), null)
})
