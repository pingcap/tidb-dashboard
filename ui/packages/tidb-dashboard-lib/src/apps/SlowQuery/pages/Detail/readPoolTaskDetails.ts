// Copyright 2026 PingCAP, Inc.

/** Aggregate statistics recorded for a Read Pool metric. */
export type ReadPoolAggregate = {
  total?: number | string
  avg?: number | string
  max?: number | string
  min?: number | string
}

type ReadPoolTaskDetails = {
  tasks?: number | string
  poll_count?: ReadPoolAggregate
  dispatch_count?: ReadPoolAggregate
  task_wall_time?: ReadPoolAggregate
  queue_wait?: ReadPoolAggregate
  wake_wait?: ReadPoolAggregate
  fair_queue?: {
    enabled?: boolean
    waited_task_slices?: ReadPoolAggregate
  }
  poll_cpu?: ReadPoolAggregate
  poll_wall?: ReadPoolAggregate
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValue(value: unknown) {
  return (
    value === undefined ||
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
}

function isAggregate(value: unknown) {
  return (
    value === undefined ||
    (isObject(value) &&
      ['total', 'avg', 'max', 'min'].every((key) => isValue(value[key])))
  )
}

function isDetails(value: unknown): value is ReadPoolTaskDetails {
  if (!isObject(value) || !isValue(value.tasks)) return false
  const aggregateKeys = [
    'poll_count',
    'dispatch_count',
    'task_wall_time',
    'queue_wait',
    'wake_wait',
    'poll_cpu',
    'poll_wall'
  ]
  if (!aggregateKeys.every((key) => isAggregate(value[key]))) return false
  if (value.fair_queue !== undefined) {
    if (!isObject(value.fair_queue)) return false
    const { enabled, waited_task_slices: slices } = value.fair_queue
    if (enabled !== undefined && typeof enabled !== 'boolean') return false
    if (!isAggregate(slices)) return false
  }
  return ['tasks', 'fair_queue', ...aggregateKeys].some(
    (key) => value[key] !== undefined
  )
}

/** Parse JSON or TiDB's compact slow-log format without evaluating input. */
export function parseReadPoolTaskDetails(
  raw: unknown
): ReadPoolTaskDetails | null {
  let value: unknown = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw)
    } catch {
      // TiDB emits unquoted keys and Go duration values, preserved by ingestion.
      if (!/^\s*\{\s*tasks\s*:/.test(raw)) return null
      const json = raw
        .replace(/([{,]\s*)([a-z_]+)\s*:/g, '$1"$2":')
        .replace(
          /:\s*((?:\d+(?:\.\d+)?(?:ns|µs|μs|us|ms|s|m|h))+)(?=\s*[,}])/g,
          ': "$1"'
        )
      try {
        value = JSON.parse(json)
      } catch {
        return null
      }
    }
  }
  return isDetails(value) ? value : null
}
