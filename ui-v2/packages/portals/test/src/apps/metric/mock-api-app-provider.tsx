import {
  V2Metrics,
  metricsServiceGetClusterMetricData,
  metricsServiceGetClusterMetricInstance,
  metricsServiceGetHostMetricData,
  metricsServiceGetMetrics,
  metricsServiceGetTopMetricConfig,
  metricsServiceGetTopMetricData,
} from "@pingcap-incubator/tidb-dashboard-lib-api-client"
import {
  AppCtxValue,
  SinglePanelConfig,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import {
  PromResultItem,
  TransformNullValue,
  delay,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/utils"
import { useMemo } from "react"

import { normalQueryConfig } from "./sample-data/normal-configs"
import qpsType from "./sample-data/qps-type.json"

const testHostId = import.meta.env.VITE_TEST_HOST_ID
const testClusterId = import.meta.env.VITE_TEST_CLUSTER_ID

function transformConfigs(metrics: V2Metrics["metrics"]): SinglePanelConfig[] {
  const configs: SinglePanelConfig[] = []

  const groups = [...new Set((metrics || []).map((m) => m.group || ""))]
  groups.forEach((group) => {
    const categories = [
      ...new Set(
        (metrics?.filter((m) => m.group === group) || []).map(
          (m) => m.type || "",
        ),
      ),
    ]
    categories.forEach((category) => {
      const charts = metrics?.filter(
        (m) => m.type === category && m.group === group && m.name,
      )
      configs.push({
        group,
        category,
        displayName: category,
        charts:
          charts?.map((metric) => ({
            metricName: metric.name!,
            title: metric.displayName!,
            label: metric.description,
            queries: [],
            nullValue: TransformNullValue.AS_ZERO,
            unit: metric.metric?.unit ?? "short",
          })) ?? [],
      })
    })
  })

  return configs
}

export function useCtxValue(): AppCtxValue {
  let lastKind = "azores-overview"

  return useMemo(
    () => ({
      ctxId: "metric",
      api: {
        getMetricQueriesConfig: async (kind) => {
          lastKind = kind
          if (kind === "normal") {
            return normalQueryConfig
          }
          let metrics
          if (kind === "azores-overview") {
            metrics = await metricsServiceGetMetrics({
              class: "overview",
              group: "overview",
            }).then((res) => res.metrics)
          } else if (kind === "azores-host") {
            metrics = await metricsServiceGetMetrics({
              class: "host",
            }).then((res) => res.metrics)
          } else if (kind === "azores-cluster-overview") {
            metrics = await metricsServiceGetMetrics({
              class: "cluster",
              group: "overview",
            }).then((res) => res.metrics)
          } else {
            // kind === 'azores-cluster'
            metrics = await metricsServiceGetMetrics({
              class: "cluster",
            }).then((res) => res.metrics)
          }
          return transformConfigs(metrics)
        },

        getMetricConfig() {
          return metricsServiceGetTopMetricConfig().then((res) => ({
            delaySec: (res.cacheFlushIntervalInMinutes || 0) * 60,
          }))
        },

        getMetricLabelValues(params) {
          return metricsServiceGetClusterMetricInstance(
            testClusterId,
            params.metricName,
          ).then((res) => res.instanceList ?? [])
        },

        getMetricDataByPromQL() {
          return delay(1000).then(
            () => qpsType.data.result as unknown as PromResultItem[],
          )
        },

        getMetricDataByMetricName: async ({
          metricName,
          beginTime,
          endTime,
          step,
          label,
        }) => {
          let queryData
          if (lastKind === "azores-overview") {
            queryData = await metricsServiceGetTopMetricData(metricName, {
              startTime: beginTime.toString(),
              endTime: endTime.toString(),
              step: step.toString(),
            }).then((res) => res.data)
          } else if (lastKind === "azores-host") {
            queryData = await metricsServiceGetHostMetricData(
              testHostId,
              metricName,
              {
                startTime: beginTime.toString(),
                endTime: endTime.toString(),
                step: step.toString(),
              },
            ).then((res) => res.data)
          } else {
            // lastKind === 'azores-cluster-overview' || lastKind === 'azores-cluster'
            queryData = await metricsServiceGetClusterMetricData(
              testClusterId,
              metricName,
              {
                startTime: beginTime.toString(),
                endTime: endTime.toString(),
                step: step.toString(),
                label,
              },
            ).then((res) => res.data)
          }

          const ret = queryData?.map((d) => ({
            expr: d.expr ?? "",
            legend: d.legend ?? "",
            result: (d.result as PromResultItem[]) ?? [],
            promAddr: d.prometheusAddress ?? "",
          }))

          return ret ?? []
        },
      },
      cfg: {
        title: "",
        scrapeInterval: 30,
      },
      actions: {
        openDiagnosis(id) {
          const [from, to] = id.split(",")
          window.open(`/statement?from=${from}&to=${to}`, "_blank")
        },
        openHostMonitoring(id) {
          window.open(`/metrics/azores-host?host_id=${id}`, "_blank")
        },
      },
    }),
    [],
  )
}
