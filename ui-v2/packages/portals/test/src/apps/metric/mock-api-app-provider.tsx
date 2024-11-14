import { delay } from "@pingcap-incubator/tidb-dashboard-lib-apps"
import { AppCtxValue } from "@pingcap-incubator/tidb-dashboard-lib-apps/metric"
import { useMemo } from "react"

import { queryConfig } from "./sample-data/query-config"

export function useCtxValue(): AppCtxValue {
  return useMemo(
    () => ({
      ctxId: "metric",
      api: {
        getMetrics() {
          return delay(1000).then(() => [])
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
