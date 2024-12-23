import {
  DiagnosisServiceAddSqlLimitBodyAction,
  diagnosisServiceAddSqlLimit,
  diagnosisServiceBindSqlPlan,
  diagnosisServiceCheckSqlLimitSupport,
  diagnosisServiceCheckSqlPlanSupport,
  diagnosisServiceGetResourceGroupList,
  diagnosisServiceGetSqlLimitList,
  diagnosisServiceGetSqlPlanBindingList,
  diagnosisServiceGetSqlPlanList,
  diagnosisServiceGetTopSqlAvailableAdvancedFilterInfo,
  // diagnosisServiceGetTopSqlAvailableAdvancedFilters,
  diagnosisServiceGetTopSqlDetail,
  diagnosisServiceGetTopSqlList,
  diagnosisServiceRemoveSqlLimit,
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

const clusterId = import.meta.env.VITE_TEST_CLUSTER_ID

export function useCtxValue(): AppCtxValue {
  const navigate = useNavigate()

  return useMemo(
    () => ({
      ctxId: `statement-${clusterId}`,
      api: {
        getStmtKinds() {
          return delay(1000).then(() => [])
          return delay(1000).then(() => ["Select", "Update", "Delete"])
        },
        getDbs() {
          // diagnosisServiceGetTopSqlAvailableAdvancedFilters(clusterId)
          return diagnosisServiceGetTopSqlAvailableAdvancedFilterInfo(
            clusterId,
            "schema_name",
            {
              skipGlobalErrorHandling: true,
            },
          ).then((res) => res.valueList ?? [])

          return delay(1000).then(() => ["db1", "db2"])
        },
        getRuGroups() {
          return diagnosisServiceGetResourceGroupList(clusterId, {
            skipGlobalErrorHandling: true,
          }).then((res) => (res.resourceGroups ?? []).map((r) => r.name || ""))
        },

        getStmtList(params) {
          return diagnosisServiceGetTopSqlList(clusterId, {
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
          return diagnosisServiceGetSqlPlanList(clusterId, {
            beginTime: beginTime + "",
            endTime: endTime + "",
            digest,
            schemaName,
          }).then((res) => res.data ?? [])
        },
        getStmtPlansDetail(params) {
          const [beginTime, endTime, digest, _schemaName] = params.id.split(",")
          return diagnosisServiceGetTopSqlDetail(clusterId, digest, {
            beginTime: beginTime + "",
            endTime: endTime + "",
            planDigest: params.plans,
          }).then((d) => {
            if (d.binary_plan_text) {
              d.plan = d.binary_plan_text
            }
            return d
          })
        },

        // sql plan bind
        checkPlanBindSupport() {
          return diagnosisServiceCheckSqlPlanSupport(clusterId).then((res) => ({
            is_support: res.isSupport!,
          }))
        },
        getPlanBindStatus(params) {
          return diagnosisServiceGetSqlPlanBindingList(clusterId, {
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
          return diagnosisServiceBindSqlPlan(clusterId, params.planDigest).then(
            () => {},
          )
        },
        deletePlanBind(params) {
          return diagnosisServiceUnbindSqlPlan(clusterId, {
            digest: params.sqlDigest,
          }).then(() => {})
        },

        // sql limit
        checkSqlLimitSupport() {
          return diagnosisServiceCheckSqlLimitSupport(clusterId).then(
            (res) => ({ is_support: res.isSupport! }),
          )
        },
        getSqlLimitStatus(params) {
          return diagnosisServiceGetSqlLimitList(clusterId, {
            watchText: params.watchText,
          }).then((res) => ({
            ru_group: res.data?.[0]?.resourceGroupName ?? "",
            action: res.data?.[0]?.action ?? "",
          }))
        },
        createSqlLimit(params) {
          return diagnosisServiceAddSqlLimit(clusterId, {
            watchText: params.watchText,
            resourceGroup: params.ruGroup,
            action: params.action as DiagnosisServiceAddSqlLimitBodyAction,
          }).then(() => {})
        },
        deleteSqlLimit(params) {
          return diagnosisServiceRemoveSqlLimit(clusterId, params).then(
            () => {},
          )
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
