import { TimeRange } from '@lib/components/TimeRangeSelector'

export const TIME_WINDOW_RECENT_SECONDS = [
  15 * 60,
  30 * 60,
  60 * 60,
  3 * 60 * 60,
  6 * 60 * 60,
  12 * 60 * 60,
  24 * 60 * 60
]

export const DEFAULT_TIME_WINDOW: TimeRange = {
  type: 'recent',
  value: TIME_WINDOW_RECENT_SECONDS[1]
}

export const WORKLOAD_TYPES = [
  'oltp_read_write',
  'oltp_read_only',
  'oltp_write_only',
  'tpcc'
]
