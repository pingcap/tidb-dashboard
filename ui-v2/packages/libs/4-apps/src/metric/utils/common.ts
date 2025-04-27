import {
  TimeRange,
  toTimeRangeValue,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"

export function fixTimeRange(
  timeRange: TimeRange,
  step: number = 30,
): [number, number] {
  const tr = toTimeRangeValue(timeRange)
  const end = tr[1] - (tr[1] % step)
  const begin = tr[0] - (tr[0] % step)
  return [begin, end]
}
