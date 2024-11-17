import { delay } from "@pingcap-incubator/tidb-dashboard-lib-apps"
import {
  AppCtxValue,
  PromResult,
  SeriesType,
  TransformNullValue,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { useMemo } from "react"

import configs from "./sample-data/configs.json"
import qpsType from "./sample-data/qps-type.json"

const transformedConfigs = [
  {
    category: "instance_top",
    displayName: "Top 5 Cluster Utilization",
    charts: configs.metrics
      .filter((m) => m.type === "instance_top")
      ?.map((m) => ({
        metricName: m.name,
        title: m.displayName,
        label: m.description,
        queries: m.metric.expressions.map((e) => ({
          promql: e.promql,
          legendName: e.legendName,
          type: "line" as SeriesType,
        })),
        nullValue: TransformNullValue.AS_ZERO,
        unit: m.metric.unit,
      })),
  },
  {
    category: "cluster_top",
    displayName: "Top 5 Cluster Utilization",
    charts: configs.metrics
      .filter((m) => m.type === "cluster_top")
      ?.map((m) => ({
        metricName: m.name,
        title: m.displayName,
        label: m.description,
        queries: m.metric.expressions.map((e) => ({
          promql: e.promql,
          legendName: e.legendName,
          type: "line" as SeriesType,
        })),
        nullValue: TransformNullValue.AS_ZERO,
        unit: m.metric.unit,
      })),
  },
]

export function useCtxValue(): AppCtxValue {
  return useMemo(
    () => ({
      ctxId: "metric",
      api: {
        getMetricQueriesConfig(_kind: string) {
          return delay(1000).then(() => transformedConfigs)
        },
        getMetricDataByPromQL() {
          return Promise.resolve([])
        },
        getMetricDataByMetricName(_params: {
          metricName: string
          beginTime: number
          endTime: number
          step: number
        }) {
          console.log("getMetric", _params)
          return Promise.resolve(qpsType.data as unknown as PromResult[])
        },
      },
      cfg: {
        title: "",
        scrapeInterval: 15,
      },
    }),
    [],
  )
}
