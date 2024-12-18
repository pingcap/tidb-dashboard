import {
  clusterServiceGetSqlPlanList,
  clusterServiceGetTopSqlDetail,
  clusterServiceGetTopSqlList,
} from "@pingcap-incubator/tidb-dashboard-lib-api-client"
import {
  AppCtxValue,
  StatementModel,
} from "@pingcap-incubator/tidb-dashboard-lib-apps/statement"
import { delay } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useNavigate } from "@tanstack/react-router"
import { useMemo } from "react"

import listData from "./sample-data/list-2.json"
import plansDetailData from "./sample-data/plans-detail-1.json"
import plansListData from "./sample-data/plans-list-1.json"

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
      ctxId: "statement",
      api: {
        getStmtKinds() {
          return delay(1000).then(() => ["Select", "Update", "Delete"])
        },
        getDbs() {
          return delay(1000).then(() => ["db1", "db2"])
        },
        getRuGroups() {
          return delay(1000).then(() => ["default", "ru1", "ru2"])
        },

        getStmtList(params) {
          return clusterServiceGetTopSqlList(testClusterId, {
            beginTime: params.beginTime + "",
            endTime: params.endTime + "",
            db: params.dbs,
            text: params.term,
            orderBy: params.orderBy,
            isDesc: params.desc,
            fields:
              "digest_text,sum_latency,avg_latency,max_latency,min_latency,exec_count,plan_count",
          }).then((res) => res.data ?? [])

          return delay(1000).then(() => listData)
        },
        getStmtPlans(params) {
          const [beginTime, endTime, digest, schemaName] = params.id.split(",")
          return clusterServiceGetSqlPlanList(testClusterId, {
            beginTime: beginTime + "",
            endTime: endTime + "",
            digest,
            schemaName,
          }).then((res) => res.data ?? [])

          return delay(1000).then(() => plansListData)
        },
        getStmtPlansDetail(params) {
          const [beginTime, endTime, digest, _schemaName] = params.id.split(",")
          return clusterServiceGetTopSqlDetail(testClusterId, digest, {
            beginTime: beginTime + "",
            endTime: endTime + "",
          }).then((d) => ({
            ...d,
            plan: d.binary_plan_text,
          }))

          return delay(1000)
            .then(() => plansDetailData as StatementModel)
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
          window.preUrl = [window.location.pathname + window.location.search]
          navigate({ to: `/statement/detail?id=${id}` })
        },
        backToList: () => {
          const preUrl = window.preUrl?.pop()
          navigate({ to: preUrl || "/statement/list" })
        },
        openSlowQueryList(id) {
          const [from, to, digest, _schema, ...plans] = id.split(",")
          const fullUrl = `/slow-query/list?from=${from}&to=${to}&digest=${digest}&plans=${plans.join(",")}`
          // open in a new tab
          window.open(fullUrl, "_blank")
        },
      },
    }),
    [navigate],
  )
}
