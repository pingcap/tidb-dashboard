import { toTimeRangeValue } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useQuery } from "@tanstack/react-query"

import { useAppContext } from "../ctx"
import { useSqlHistoryState } from "../shared-state/memory-state"

export function useSqlHistoryMetricNamesData() {
  const ctx = useAppContext()
  return useQuery({
    queryKey: [ctx.ctxId, "sql-history", "metric-names"],
    queryFn: () => ctx.api.getHistoryMetricNames(),
  })
}

export function useSqlHistoryMetricData() {
  const ctx = useAppContext()
  const metric = useSqlHistoryState((state) => state.metric)
  const timeRange = useSqlHistoryState((state) => state.timeRange)

  return useQuery({
    queryKey: [
      ctx.ctxId,
      "sql-history",
      "metric-data",
      ctx.sqlDigest,
      metric,
      timeRange,
    ],
    queryFn: () => {
      const tr = toTimeRangeValue(timeRange!)
      return ctx.api.getHistoryMetricData({
        sqlDigest: ctx.sqlDigest,
        metricName: metric!.name,
        beginTime: tr[0],
        endTime: tr[1],
      })
    },
    enabled: !!metric && !!timeRange,
  })
}
