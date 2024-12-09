import {
  AppCtxValue,
  MetricDataByNameResultItem,
  PromResultItem,
  SinglePanelConfig,
  TransformNullValue,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { delay } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { IModels, http } from "../../rapper"

import azoresClusterConfig from "./sample-data/azores-cluster-configs.json"
import azoresClusterOverviewConfig from "./sample-data/azores-cluster-overview-configs.json"
import azoresHostConfig from "./sample-data/azores-host-configs.json"
import azoresOverviewConfig from "./sample-data/azores-overview-configs.json"
import cpuUsage from "./sample-data/cup-usage.json"
import { queryConfig } from "./sample-data/normal-configs"
import qpsType from "./sample-data/qps-type.json"

function transformConfigs(
  configs: IModels["GET/api/v2/metrics"]["Res"],
): SinglePanelConfig[] {
  const categories = [...new Set(configs.metrics!.map((m) => m.type!))]
  return categories.map((c) => {
    const charts = configs.metrics!.filter((m) => m.type === c)
    return {
      group: charts[0].group!,
      category: c,
      displayName: "",
      charts: charts?.map((m) => ({
        metricName: m.name!,
        title: m.displayName!,
        label: m.description!,
        queries: [],
        nullValue: TransformNullValue.AS_ZERO,
        unit: m.metric!.unit!,
      })),
    }
  })
}

export function useCtxValue(): AppCtxValue {
  // let _kind = "azores-overview"
  return useMemo(
    () => ({
      ctxId: "metric",
      api: {
        getMetricQueriesConfig(kind: string) {
          // _kind = kind
          return delay(1000).then(() => {
            if (kind === "azores-overview") {
              return transformConfigs(azoresOverviewConfig)
            } else if (kind === "azores-host") {
              return transformConfigs(azoresHostConfig)
            } else if (kind === "azores-cluster-overview") {
              return transformConfigs(azoresClusterOverviewConfig)
              return http("GET/api/v2/metrics", {
                class: "cluster",
                group: "overview",
              }).then((res) => transformConfigs(res))
            } else if (kind === "azores-cluster") {
              const configs = {
                metrics: azoresClusterConfig.metrics!.filter(
                  (m) => m.group !== "overview",
                ),
              }
              return transformConfigs(configs)
              return http("GET/api/v2/metrics", { class: "cluster" })
                .then((res) => ({
                  metrics: res.metrics!.filter((m) => m.group !== "overview"),
                }))
                .then((res) => transformConfigs(res))
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
          // if (_kind === "azores-overview") {
          //   return http("GET/api/v2/overview/metrics/{name}/data", { name: _params.metricName, startTime: _params.beginTime + '', endTime: _params.endTime + '', step: _params.step + '' }).then(res => res.data)
          // } else if (_kind === "azores-host") {
          //   return http("GET/api/v2/hosts/{hostId}/metrics/{name}/data", { hostId: '1', name: _params.metricName, startTime: _params.beginTime + '', endTime: _params.endTime + '', step: _params.step + '' }).then(res => res.data)
          // } else if (_kind === "azores-cluster-overview") {
          //   return http('GET/api/v2/clusters/{clusterId}/metrics/{name}/data', { clusterId: 'tidb-1cb4e027', name: _params.metricName, startTime: _params.beginTime + '', endTime: _params.endTime + '', step: _params.step + '' }).then(res => res.data)
          // } else if (_kind === "azores-cluster") {
          //   return http('GET/api/v2/clusters/{clusterId}/metrics/{name}/data', { clusterId: 'tidb-1cb4e027', name: _params.metricName, startTime: _params.beginTime + '', endTime: _params.endTime + '', step: _params.step + '' }).then(res => res.data)
          // }
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
