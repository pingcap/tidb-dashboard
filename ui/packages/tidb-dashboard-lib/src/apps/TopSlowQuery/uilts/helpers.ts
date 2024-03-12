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
  value: TIME_RANGE_RECENT_SECONDS[0]
}

export const TIME_WINDOW_SIZES = [
  { label: '1 hour', value: 60 * 60 },
  { label: '3 hours', value: 3 * 60 * 60 },
  { label: '6 hours', value: 6 * 60 * 60 },
  { label: '12 hours', value: 12 * 60 * 60 },
  { label: '1 day', value: 24 * 60 * 60 },
  { label: '7 days', value: 7 * 24 * 60 * 60 }
]

export const TOP_N_TYPES = [
  { label: 'Total TiDB Memory', value: 'sum_memory' },
  { label: 'Max TiDB Memory', value: 'max_memory' },
  { label: 'Avg TiDB Memory', value: 'avg_memory' },
  { label: 'Total Latency', value: 'sum_latency' },
  { label: 'Max Latency', value: 'max_latency' },
  { label: 'Avg Latency', value: 'avg_latency' },
  { label: 'Count', value: 'count' }
]
