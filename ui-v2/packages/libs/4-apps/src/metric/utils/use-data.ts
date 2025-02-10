import {
  TimeRange,
  resolvePromQLTemplate,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { useAppContext } from "../ctx"
import { useMetricsUrlState } from "../shared-state/url-state"
import { MetricConfigKind } from "../utils/type"

import { fixTimeRange } from "./common"

export function useMetricQueriesConfigData(kind: MetricConfigKind) {
  const ctx = useAppContext()

  return useQuery({
    queryKey: [ctx.ctxId, "metric-queries-config", kind],
    queryFn: () => ctx.api.getMetricQueriesConfig(kind),
  })
}

export function useMetricConfigData() {
  const ctx = useAppContext()

  return useQuery({
    queryKey: [ctx.ctxId, "metric-config"],
    queryFn: () => ctx.api.getMetricConfig(),
  })
}

export function useMetricLabelValuesData(
  metricName: string,
  labelName: string,
  timeRange: TimeRange,
) {
  const ctx = useAppContext()

  return useQuery({
    queryKey: [
      ctx.ctxId,
      "metric-label-values",
      metricName,
      labelName,
      timeRange,
    ],
    queryFn: () => {
      const tr = fixTimeRange(timeRange)
      return ctx.api.getMetricLabelValues({
        metricName,
        labelName,
        beginTime: tr[0],
        endTime: tr[1],
      })
    },
    enabled: !!metricName,
  })
}

export function useMetricDataByMetricName(
  metricName: string,
  timeRange: TimeRange,
  stepFn: () => number,
  labelValue?: string,
) {
  const ctx = useAppContext()

  return useQuery({
    queryKey: [
      ctx.ctxId,
      "metric-data-by-metric-name",
      metricName,
      timeRange,
      // step is not the query key, it is expected
      labelValue,
    ],
    queryFn: () => {
      const step = stepFn()
      const tr = fixTimeRange(timeRange)
      return ctx.api.getMetricDataByMetricName({
        metricName,
        beginTime: tr[0],
        endTime: tr[1],
        step,
        label: labelValue,
      })
    },
    placeholderData: keepPreviousData,
    // set `enabled: false`, so queryFn can only be manually triggered by calling `refetch()`
    enabled: false,
  })
}

export function useMetricDataByPromQLs(
  promQLs: string[],
  timeRange: TimeRange,
  stepFn: () => number,
) {
  const ctx = useAppContext()

  return useQuery({
    queryKey: [ctx.ctxId, "metric-data-by-promqls", promQLs, timeRange],
    queryFn: () => {
      const step = stepFn()
      const tr = fixTimeRange(timeRange)
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
    // set `enabled: false`, so queryFn can only be manually triggered by calling `refetch()`
    enabled: false,
  })
}

//---------------------------

export function useCurPanelConfigsData() {
  const { panel } = useMetricsUrlState()
  const { data: panelConfigData, isLoading } =
    useMetricQueriesConfigData("azores-cluster")

  const filteredPanelConfigData = panelConfigData?.filter(
    (p) => p.group === (panel || "basic"),
  )

  return {
    panelConfigData: filteredPanelConfigData,
    isLoading,
  }
}
