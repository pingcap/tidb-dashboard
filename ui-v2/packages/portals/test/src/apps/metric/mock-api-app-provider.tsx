import { delay } from "@pingcap-incubator/tidb-dashboard-lib-apps"
import {
  AppCtxValue,
  PromResultItem,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { useMemo } from "react"

import { queryConfig } from "./sample-data/configs"
import qpsType from "./sample-data/qps-type.json"

export function useCtxValue(): AppCtxValue {
  return useMemo(
    () => ({
      ctxId: "metric",
      api: {
        getMetricQueriesConfig() {
          return delay(1000).then(() => queryConfig)
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
        getMetricDataByMetricName() {
          return Promise.resolve([])
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
