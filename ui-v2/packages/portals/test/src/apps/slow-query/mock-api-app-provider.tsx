import { clusterServiceGetSlowQueryList } from "@pingcap-incubator/tidb-dashboard-lib-api-client"
import { AppCtxValue } from "@pingcap-incubator/tidb-dashboard-lib-apps/slow-query"
import { delay } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useNavigate } from "@tanstack/react-router"
import { useMemo } from "react"

// import { http } from "../../rapper"

import detailData from "./sample-data/detail-3.json"
import listData from "./sample-data/list-2.json"

declare global {
  interface Window {
    preUrl?: string[]
  }
}

const testClusterId = import.meta.env.VITE_TEST_CLUSTER_ID

export function useCtxValue(): AppCtxValue {
  const navigate = useNavigate()

  return useMemo(
    () => ({
      ctxId: "slow-query",
      api: {
        getDbs() {
          return delay(1000).then(() => ["db1", "db2"])
        },
        getRuGroups() {
          return delay(1000).then(() => ["default", "ru1", "ru2"])
        },

        getSlowQueries(params) {
          console.log("getSlowQueries", params)

          return clusterServiceGetSlowQueryList(testClusterId, {
            beginTime: params.beginTime + "",
            endTime: params.endTime + "",
            db: params.dbs,
            text: params.term,
            orderBy: params.orderBy,
            isDesc: params.desc,
            pageSize: params.limit,
            fields: "query,query_time,memory_max",
          }).then((res) => res.data ?? [])

          return delay(1000).then(() => listData)
        },
        getSlowQuery(_params: { id: string }) {
          return delay(1000)
            .then(() => detailData)
            .then((d) => {
              if (d.binary_plan_text) {
                d.plan = d.binary_plan_text
              }
              return d
            })
        },
      },
      cfg: {
        title: "",
      },
      actions: {
        openDetail: (id: string) => {
          window.preUrl = [window.location.hash.slice(1)]
          navigate({ to: `/slow-query/detail?id=${id}` })
        },
        backToList: () => {
          const preUrl = window.preUrl?.pop()
          navigate({ to: preUrl || "/slow-query/list" })
        },
      },
    }),
    [navigate],
  )
}
