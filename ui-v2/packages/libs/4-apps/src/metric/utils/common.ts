import {
  TimeRange,
  toTimeRangeValue,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"

export function fixTimeRange(timeRange: TimeRange): [number, number] {
  const tr = toTimeRangeValue(timeRange)
  const end = tr[1] - (tr[1] % 30)
  const begin = tr[0] - (tr[0] % 30)
  return [begin, end]
}
