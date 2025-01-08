import {
  V2Metrics,
  metricsServiceGetClusterMetricData,
  metricsServiceGetClusterMetricInstance,
  metricsServiceGetHostMetricData,
  metricsServiceGetMetrics,
  metricsServiceGetTopMetricData,
} from "@pingcap-incubator/tidb-dashboard-lib-api-client"
import {
  AppCtxValue,
  PromResultItem,
  SinglePanelConfig,
  TransformNullValue,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { delay } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { normalQueryConfig } from "./sample-data/normal-configs"
import qpsType from "./sample-data/qps-type.json"

const testHostId = import.meta.env.VITE_TEST_HOST_ID
const testClusterId = import.meta.env.VITE_TEST_CLUSTER_ID

function transformConfigs(metrics: V2Metrics["metrics"]): SinglePanelConfig[] {
  const categories = [...new Set((metrics || []).map((m) => m.type || ""))]
  return categories.map((category) => {
    const charts = metrics!.filter((m) => m.type === category)
    return {
      group: charts[0].group!,
      category,
      displayName: category,
      charts:
        charts
          ?.filter((metric) => metric.type === category && metric.name)
          ?.map((metric) => ({
            metricName: metric.name!,
            title: metric.displayName!,
            label: metric.description,
            queries: [],
            nullValue: TransformNullValue.AS_ZERO,
            unit: metric.metric?.unit ?? "short",
          })) ?? [],
    }
  })
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

        getMetricLabelValues(params) {
          return metricsServiceGetClusterMetricInstance(
            testClusterId,
            params.metricName,
          ).then((res) => res.instanceList ?? [])
        },

        getMetricDataByPromQL(params) {
          console.log("getMetric", params)
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
          console.log("getMetric", {
            metricName,
            beginTime,
            endTime,
            step,
            label,
          })
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
          }))

          return ret ?? []
        },
      },
      cfg: {
        title: "",
        scrapeInterval: 15,
      },
      actions: {
        openDiagnosis(id) {
          const [from, to] = id.split(",")
          window.open(`/statement?from=${from}&to=${to}`, "_blank")
        },
      },
    }),
    [],
  )
}
