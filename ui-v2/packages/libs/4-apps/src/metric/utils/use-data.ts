import {
  TimeRange,
  resolvePromQLTemplate,
  toTimeRangeValue,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { useAppContext } from "../ctx"

export function useMetricQueriesConfigData(kind: string) {
  const ctx = useAppContext()

  return useQuery({
    queryKey: [ctx.ctxId, "metric", "queries-config", kind],
    queryFn: () => ctx.api.getMetricQueriesConfig(kind),
  })
}

export function useMetricDataByMetricName(
  metricName: string,
  timeRange: TimeRange,
  stepFn: () => number,
) {
  const ctx = useAppContext()

  return useQuery({
    queryKey: [
      ctx.ctxId,
      "metric",
      "metric-data-by-metric-name",
      metricName,
      timeRange,
      // step is not the query key, it is expected
    ],
    queryFn: () => {
      const step = stepFn()
      const tr = toTimeRangeValue(timeRange)
      return ctx.api.getMetricDataByMetricName({
        metricName,
        beginTime: tr[0],
        endTime: tr[1],
        step,
      })
    },
    placeholderData: keepPreviousData,
    enabled: false, // set enabled:false, so queryFn can only be manually triggered by calling `refetch()`
  })
}

export function useMetricDataByPromQLs(
  promQLs: string[],
  timeRange: TimeRange,
  stepFn: () => number,
) {
  const ctx = useAppContext()

  return useQuery({
    queryKey: [
      ctx.ctxId,
      "metric",
      "metric-data-by-promqls",
      promQLs,
      timeRange,
    ],
    queryFn: () => {
      const step = stepFn()
      const tr = toTimeRangeValue(timeRange)
      return Promise.all(
        promQLs.map((pq) =>
          ctx.api.getMetricDataByPromQL({
            promQL: resolvePromQLTemplate(pq, step, ctx.cfg.scrapeInterval),
            beginTime: tr[0],
            endTime: tr[1],
            step,
          }),
        ),
      )
    },
    placeholderData: keepPreviousData,
    enabled: false,
  })
}
