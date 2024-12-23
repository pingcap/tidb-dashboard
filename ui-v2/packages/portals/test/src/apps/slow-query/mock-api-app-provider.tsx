import {
  DiagnosisServiceAddSqlLimitBodyAction,
  diagnosisServiceAddSqlLimit,
  diagnosisServiceCheckSqlLimitSupport,
  diagnosisServiceGetResourceGroupList,
  diagnosisServiceGetSlowQueryAvailableAdvancedFilterInfo,
  // diagnosisServiceGetSlowQueryAvailableAdvancedFilters,
  diagnosisServiceGetSlowQueryDetail,
  diagnosisServiceGetSlowQueryList,
  diagnosisServiceGetSqlLimitList,
  diagnosisServiceRemoveSqlLimit,
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

const clusterId = import.meta.env.VITE_TEST_CLUSTER_ID

export function useCtxValue(): AppCtxValue {
  const navigate = useNavigate()

  return useMemo(
    () => ({
      ctxId: `slow-query-${clusterId}`,
      api: {
        getDbs() {
          // diagnosisServiceGetSlowQueryAvailableAdvancedFilters(clusterId)
          return diagnosisServiceGetSlowQueryAvailableAdvancedFilterInfo(
            clusterId,
            "db",
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

        getSlowQueries(params) {
          console.log("getSlowQueries", params)

          let sqlDigestFilter = ""
          if (params.sqlDigest) {
            sqlDigestFilter = `digest = ${params.sqlDigest}`
          }
          return diagnosisServiceGetSlowQueryList(clusterId, {
            beginTime: params.beginTime + "",
            endTime: params.endTime + "",
            db: params.dbs,
            text: params.term,
            orderBy: params.orderBy,
            isDesc: params.desc,
            pageSize: params.limit,
            fields: "query,query_time,memory_max",
            advancedFilter: sqlDigestFilter ? [sqlDigestFilter] : [],
          }).then((res) => res.data ?? [])
        },
        getSlowQuery(params: { id: string }) {
          const [digest, connectionId, timestamp] = params.id.split(",")
          return diagnosisServiceGetSlowQueryDetail(clusterId, digest, {
            connectionId,
            timestamp: Number(timestamp),
          }).then((d) => {
            if (d.binary_plan_text) {
              d.plan = d.binary_plan_text
            }
            return d
          })
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
