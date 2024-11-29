import { delay } from "@pingcap-incubator/tidb-dashboard-lib-apps"
import {
  AppCtxValue,
  MetricDataByNameResultItem,
  PromResultItem,
  TransformNullValue,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { useMemo } from "react"

import azoresHostConfig from "./sample-data/azores-host-configs.json"
import azoresOverviewConfig from "./sample-data/azores-overview-configs.json"
import cpuUsage from "./sample-data/cup-usage.json"
import { queryConfig } from "./sample-data/normal-configs"
import qpsType from "./sample-data/qps-type.json"

const transformedOverviewConfigs = [
  { category: "cluster_top", displayName: "" },
  { category: "host_top", displayName: "" },
  { category: "instance_top", displayName: "" },
].map((c) => ({
  ...c,
  charts: azoresOverviewConfig.metrics
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

const transformedHostConfigs = [
  { category: "performance", displayName: "" },
  { category: "resource", displayName: "" },
  { category: "memory", displayName: "" },
].map((c) => ({
  ...c,
  charts: azoresHostConfig.metrics
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
        getMetricQueriesConfig(kind: string) {
          return delay(1000).then(() => {
            if (kind === "azores-overview") {
              return transformedOverviewConfigs
            } else if (kind === "azores-host") {
              return transformedHostConfigs
            }
            return queryConfig
          })
        },

        getMetricDataByPromQL(_params: {
          promQL: string
          beginTime: number
          endTime: number
          step: number
        }) {
          console.log("getMetric", _params)
          return delay(1000).then(
            () => qpsType.data.result as unknown as PromResultItem[],
          )
        },

        getMetricDataByMetricName(_params: {
          metricName: string
          beginTime: number
          endTime: number
          step: number
        }) {
          console.log("getMetric", _params)
          return delay(1000).then(
            () => cpuUsage.data as unknown as MetricDataByNameResultItem[],
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
