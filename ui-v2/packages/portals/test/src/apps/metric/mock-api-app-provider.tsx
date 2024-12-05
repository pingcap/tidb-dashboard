import {
  AppCtxValue,
  MetricDataByNameResultItem,
  PromResultItem,
  SinglePanelConfig,
  TransformNullValue,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { delay } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import azoresHostConfig from "./sample-data/azores-host-configs.json"
import azoresOverviewConfig from "./sample-data/azores-overview-configs.json"
import cpuUsage from "./sample-data/cup-usage.json"
import { queryConfig } from "./sample-data/normal-configs"
import qpsType from "./sample-data/qps-type.json"

function transformConfigs(
  configs: typeof azoresOverviewConfig,
): SinglePanelConfig[] {
  const categories = [...new Set(configs.metrics.map((m) => m.type))]
  return categories.map((c) => ({
    category: c,
    displayName: "",
    charts: configs.metrics
      .filter((m) => m.type === c)
      ?.map((m) => ({
        metricName: m.name,
        title: m.displayName,
        label: m.description,
        queries: [],
        nullValue: TransformNullValue.AS_ZERO,
        unit: m.metric.unit,
      })),
  }))
}

export function useCtxValue(): AppCtxValue {
  return useMemo(
    () => ({
      ctxId: "metric",
      api: {
        getMetricQueriesConfig(kind: string) {
          return delay(1000).then(() => {
            if (kind === "azores-overview") {
              return transformConfigs(azoresOverviewConfig)
            } else if (kind === "azores-host") {
              return transformConfigs(azoresHostConfig)
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
