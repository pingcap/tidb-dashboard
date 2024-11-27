import { delay } from "@pingcap-incubator/tidb-dashboard-lib-apps"
import {
  AppCtxValue,
  MetricDataByNameResultItem,
  TransformNullValue,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { useMemo } from "react"

import configs from "./sample-data/configs.json"
import qpsType from "./sample-data/qps-type.json"

const transformedConfigs = [
  { category: "cluster_top", displayName: "Top 5 Cluster Utilization" },
  { category: "host_top", displayName: "Top 5 Host Performance" },
  { category: "instance_top", displayName: "Top 5 SQL Performance" },
].map((c) => ({
  ...c,
  charts: configs.metrics
    .filter((m) => m.type === c.category)
    ?.map((m) => ({
      metricName: m.name,
      title: m.displayName,
      label: m.description,
      // queries: m.metric.expressions.map((e) => ({
      //   promql: e.promql,
      //   legendName: e.legendName,
      //   type: "line" as SeriesType,
      // })),
      queries: [],
      nullValue: TransformNullValue.AS_ZERO,
      unit: m.metric.unit,
    })),
}))

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
          return delay(1000).then(() => qpsType.data as unknown as MetricDataByNameResultItem[])
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
