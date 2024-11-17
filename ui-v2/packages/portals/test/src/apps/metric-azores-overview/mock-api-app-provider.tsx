import { delay } from "@pingcap-incubator/tidb-dashboard-lib-apps"
import {
  AppCtxValue,
  PromResultItem,
  SeriesType,
  TransformNullValue,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { useMemo } from "react"

import configs from "./sample-data/configs.json"
import qpsType from "./sample-data/qps-type.json"
// import { queryConfig } from "./sample-data/query-config"

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
          // return delay(1000).then(() => queryConfig)
          return delay(1000).then(() => transformedConfigs)
        },
        getMetricData(_params: {
          metricName: string
          promql: string
          beginTime: number
          endTime: number
          step: number
        }) {
          console.log("getMetric", _params)
          return delay(1000).then(
            () => qpsType.data.result as unknown as PromResultItem[],
          )
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
