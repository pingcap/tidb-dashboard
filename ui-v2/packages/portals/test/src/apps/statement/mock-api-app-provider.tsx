import {
  diagnosisServiceBindSqlPlan,
  diagnosisServiceCheckSqlPlanSupport,
  diagnosisServiceGetSqlPlanBindingList,
  diagnosisServiceGetSqlPlanList,
  diagnosisServiceGetTopSqlDetail,
  diagnosisServiceGetTopSqlList,
  diagnosisServiceUnbindSqlPlan,
} from "@pingcap-incubator/tidb-dashboard-lib-api-client"
import { AppCtxValue } from "@pingcap-incubator/tidb-dashboard-lib-apps/statement"
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
          return diagnosisServiceGetTopSqlList(testClusterId, {
            beginTime: params.beginTime + "",
            endTime: params.endTime + "",
            db: params.dbs,
            text: params.term,
            orderBy: "sum_latency",
            isDesc: params.desc,
            fields:
              "digest_text,sum_latency,avg_latency,max_latency,min_latency,exec_count,plan_count",
          }).then((res) => res.data ?? [])
        },
        getStmtPlans(params) {
          const [beginTime, endTime, digest, schemaName] = params.id.split(",")
          return diagnosisServiceGetSqlPlanList(testClusterId, {
            beginTime: beginTime + "",
            endTime: endTime + "",
            digest,
            schemaName,
          }).then((res) => res.data ?? [])
        },
        getStmtPlansDetail(params) {
          const [beginTime, endTime, digest, _schemaName] = params.id.split(",")
          return diagnosisServiceGetTopSqlDetail(testClusterId, digest, {
            beginTime: beginTime + "",
            endTime: endTime + "",
          }).then((d) => {
            if (d.binary_plan_text) {
              d.plan = d.binary_plan_text
            }
            return d
          })
        },

        checkPlanBindSupport() {
          return diagnosisServiceCheckSqlPlanSupport(testClusterId).then(
            (res) => ({ is_support: res.isSupport! }),
          )
        },
        getPlanBindStatus(params) {
          return diagnosisServiceGetSqlPlanBindingList(testClusterId, {
            beginTime: params.beginTime + "",
            endTime: params.endTime + "",
            digest: params.sqlDigest,
          })
            .then((res) => res.data?.[0]?.planDigest ?? "")
            .then((d) => ({
              plan_digest: d,
            }))
        },
        createPlanBind(params) {
          return diagnosisServiceBindSqlPlan(
            testClusterId,
            params.planDigest,
          ).then(() => {})
        },
        deletePlanBind(params) {
          return diagnosisServiceUnbindSqlPlan(testClusterId, {
            digest: params.sqlDigest,
          }).then(() => {})
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
          navigate({ to: preUrl || "/statement" })
        },
        openSlowQueryList(id) {
          const [from, to, digest, _schema, ...plans] = id.split(",")
          const fullUrl = `/slow-query?from=${from}&to=${to}&digest=${digest}&plans=${plans.join(",")}`
          // open in a new tab
          window.open(fullUrl, "_blank")
        },
      },
    }),
    [navigate],
  )
}
