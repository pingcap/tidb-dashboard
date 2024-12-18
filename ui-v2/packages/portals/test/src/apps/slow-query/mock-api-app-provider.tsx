import {
  diagnosisServiceGetSlowQueryDetail,
  diagnosisServiceGetSlowQueryList,
} from "@pingcap-incubator/tidb-dashboard-lib-api-client"
import { AppCtxValue } from "@pingcap-incubator/tidb-dashboard-lib-apps/slow-query"
import { delay } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useNavigate } from "@tanstack/react-router"
import { useMemo } from "react"

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

          return diagnosisServiceGetSlowQueryList(testClusterId, {
            beginTime: params.beginTime + "",
            endTime: params.endTime + "",
            db: params.dbs,
            text: params.term,
            orderBy: params.orderBy,
            isDesc: params.desc,
            pageSize: params.limit,
            fields: "query,query_time,memory_max",
          }).then((res) => res.data ?? [])
        },
        getSlowQuery(params: { id: string }) {
          const [digest, connectionId, timestamp] = params.id.split(",")
          return diagnosisServiceGetSlowQueryDetail(testClusterId, digest, {
            connectionId,
            timestamp: Number(timestamp),
          }).then((d) => {
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
          window.preUrl = [window.location.pathname + window.location.search]
          navigate({ to: `/slow-query/detail?id=${id}` })
        },
        backToList: () => {
          const preUrl = window.preUrl?.pop()
          navigate({ to: preUrl || "/slow-query" })
        },
      },
    }),
    [navigate],
  )
}
