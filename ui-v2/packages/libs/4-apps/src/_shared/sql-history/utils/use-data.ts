import { toTimeRangeValue } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useQuery } from "@tanstack/react-query"

import { useAppContext } from "../ctx"
import {
  useSqlHistoryState,
  useTimeRangeValueState,
} from "../shared-state/memory-state"

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

  const setTRV = useTimeRangeValueState((s) => s.setTRV)

  return useQuery({
    queryKey: [
      ctx.ctxId,
      "sql-history",
      "metric-data",
      ctx.cfg.sqlDigest,
      metric,
      timeRange,
    ],
    queryFn: () => {
      const tr = toTimeRangeValue(timeRange!)
      const beginTime = tr[0]
      let endTime = tr[1]
      if (ctx.cfg.timeRangeMaxDuration) {
        const beyondMax = endTime - beginTime > ctx.cfg.timeRangeMaxDuration
        if (beyondMax) {
          endTime = beginTime + ctx.cfg.timeRangeMaxDuration
        }
        setTRV([beginTime, endTime], beyondMax)
      }
      return ctx.api.getHistoryMetricData({
        sqlDigest: ctx.cfg.sqlDigest,
        metricName: metric!.name,
        beginTime,
        endTime,
      })
    },
    enabled: !!metric && !!timeRange,
  })
}
