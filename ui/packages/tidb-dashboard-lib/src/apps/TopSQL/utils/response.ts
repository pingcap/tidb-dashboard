import type { TopsqlSummaryItem, TopsqlSummaryPlanItem } from '@lib/client'

export type TopSQLOrderBy =
  | 'cpu'
  | 'network'
  | 'logical_io'
  | 'logical_read'
  | 'logical_write'
  | 'rocksdb_block_read'

// Cloud's keyspace field identifies the logical cluster. Keep IDs as strings.
export type TopSQLSummaryPlanItem = TopsqlSummaryPlanItem & {
  responseKey?: string
}
export type TopSQLSummaryItem = Omit<TopsqlSummaryItem, 'plans'> & {
  keyspace?: string
  responseKey?: string
  plans?: TopSQLSummaryPlanItem[]
}

export function getTopSQLRecordKey(
  record?: TopSQLSummaryItem & { text?: string }
) {
  return record?.responseKey ?? record?.sql_digest ?? record?.text ?? ''
}

export function normalizeTopSQLResponse(
  records: TopSQLSummaryItem[],
  instanceKey: string
): TopSQLSummaryItem[] {
  const occurrences = new Map<string, number>()
  return records.map((record) => {
    const identity = JSON.stringify([
      instanceKey,
      record.keyspace ?? null,
      record.sql_digest ?? null,
      !!record.is_other
    ])
    const occurrence = occurrences.get(identity) || 0
    occurrences.set(identity, occurrence + 1)
    const responseKey = `${identity}:${occurrence}`
    const planOccurrences = new Map<string, number>()
    return {
      ...record,
      responseKey,
      plans: record.plans?.map((plan) => {
        const planIdentity = JSON.stringify(plan.plan_digest ?? null)
        const occurrence = planOccurrences.get(planIdentity) || 0
        planOccurrences.set(planIdentity, occurrence + 1)
        return {
          ...plan,
          responseKey: `${responseKey}:plan:${planIdentity}:${occurrence}`,
          timestamp_sec: plan.timestamp_sec?.map(
            (timestamp) => timestamp * 1000
          )
        }
      })
    }
  })
}

const metricFields = {
  cpu: 'cpu_time_ms',
  network: 'network_bytes',
  logical_io: 'logical_io_bytes',
  logical_read: 'logical_read_bytes',
  logical_write: 'logical_write_bytes',
  rocksdb_block_read: 'rocksdb_block_read_count'
} as const

export function getResponseMetricTotal(
  record: TopSQLSummaryItem,
  orderBy: TopSQLOrderBy
) {
  const field = metricFields[orderBy]
  const total = record[field]
  if (typeof total === 'number') return total
  return (record.plans || []).reduce(
    (sum, plan) => sum + (plan[field] || []).reduce((a, b) => a + b, 0),
    0
  )
}

// Only combine plans within one response record; never rank or merge records.
export function buildResponseChartData(
  records: TopSQLSummaryItem[],
  orderBy: TopSQLOrderBy
) {
  const result: Record<string, Array<[number, number]>> = {}
  records.forEach((record) => {
    const values = new Map<number, number>()
    record.plans?.forEach((plan) => {
      plan.timestamp_sec?.forEach((timestamp, index) => {
        values.set(
          timestamp,
          (values.get(timestamp) || 0) +
            (plan[metricFields[orderBy]]?.[index] ?? 0)
        )
      })
    })
    result[getTopSQLRecordKey(record)] = Array.from(values.entries())
  })
  return result
}
