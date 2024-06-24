import { TimeRange } from '@lib/components/TimeRangeSelector'

export const TIME_RANGE_RECENT_SECONDS = [
  60 * 60,
  3 * 60 * 60,
  6 * 60 * 60,
  12 * 60 * 60,
  24 * 60 * 60,
  7 * 24 * 60 * 60,
  30 * 24 * 60 * 60
]

export const DEFAULT_TIME_RANGE: TimeRange = {
  type: 'recent',
  value: TIME_RANGE_RECENT_SECONDS[6]
}

export const DURATIONS = [
  { label: '1 hour', value: 60 * 60 },
  { label: '3 hours', value: 3 * 60 * 60 },
  { label: '6 hours', value: 6 * 60 * 60 },
  { label: '12 hours', value: 12 * 60 * 60 },
  { label: '1 day', value: 24 * 60 * 60 },
  { label: '3 days', value: 3 * 24 * 60 * 60 }
]

export const STMT_KINDS = [
  'AlterTable',
  'AnalyzeTable',
  'Begin',
  'Change',
  'Insert',
  'Update',
  'Commit',
  'Delete',
  'Select',
  'Show',
  'Set',
  'Others'
]

export const ORDER_BY = [
  { label: 'Total Latency', value: 'sum_latency' },
  { label: 'Max Latency', value: 'max_latency' },
  { label: 'Avg Latency', value: 'avg_latency' },
  { label: 'Total Memory', value: 'sum_memory' },
  { label: 'Max Memory', value: 'max_memory' },
  { label: 'Avg Memory', value: 'avg_memory' },
  { label: 'Total Count', value: 'count' }
]
