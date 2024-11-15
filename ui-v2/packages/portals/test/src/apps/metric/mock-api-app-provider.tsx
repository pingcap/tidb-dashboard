import { delay } from "@pingcap-incubator/tidb-dashboard-lib-apps"
import {
  AppCtxValue,
  PromResult,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { useMemo } from "react"

import qpsType from "./sample-data/qps-type.json"
import { queryConfig } from "./sample-data/query-config"

export function useCtxValue(): AppCtxValue {
  return useMemo(
    () => ({
      ctxId: "metric",
      api: {
        getMetric(_params: {
          promql: string
          beginTime: number
          endTime: number
          step: number
        }) {
          return delay(1000).then(
            () => qpsType.data.result as unknown as PromResult,
          )
        },
      },
      cfg: {
        title: "",
        metricQueriesConfig: queryConfig,
      },
      actions: {},
    }),
    [],
  )
}
