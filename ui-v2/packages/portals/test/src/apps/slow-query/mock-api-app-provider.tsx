import {
  DiagnosisServiceAddSqlLimitBodyAction,
  diagnosisServiceAddSqlLimit,
  diagnosisServiceCheckSqlLimitSupport,
  diagnosisServiceGetResourceGroupList,
  diagnosisServiceGetSlowQueryAvailableAdvancedFilterInfo,
  diagnosisServiceGetSlowQueryAvailableAdvancedFilters,
  diagnosisServiceGetSlowQueryAvailableFields,
  diagnosisServiceGetSlowQueryDetail,
  diagnosisServiceGetSlowQueryList,
  diagnosisServiceGetSqlLimitList,
  diagnosisServiceRemoveSqlLimit,
} from "@pingcap-incubator/tidb-dashboard-lib-api-client"
import { AppCtxValue } from "@pingcap-incubator/tidb-dashboard-lib-apps/slow-query"
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
          return diagnosisServiceGetSlowQueryAvailableAdvancedFilterInfo(
            clusterId,
            "db",
            {
              skipGlobalErrorHandling: true,
            },
          ).then((res) => res.valueList ?? [])
        },
        getRuGroups() {
          return diagnosisServiceGetResourceGroupList(clusterId, {
            skipGlobalErrorHandling: true,
          }).then((res) => (res.resourceGroups ?? []).map((r) => r.name || ""))
        },
        getAdvancedFilterNames() {
          return diagnosisServiceGetSlowQueryAvailableAdvancedFilters(
            clusterId,
          ).then((res) => res.filters ?? [])
        },
        getAdvancedFilterInfo(params) {
          return diagnosisServiceGetSlowQueryAvailableAdvancedFilterInfo(
            clusterId,
            params.name,
          ).then((res) => ({
            name: res.name ?? "",
            unit: res.unit ?? "",
            values: res.valueList ?? [],
          }))
        },
        getAvailableFields() {
          return diagnosisServiceGetSlowQueryAvailableFields(clusterId).then(
            (res) => res.fields ?? [],
          )
        },

        getSlowQueries(params) {
          const advancedFiltersStrArr: string[] = []
          for (const filter of params.advancedFilters) {
            const filterValue = filter.values
              .map((v) => encodeURIComponent(v))
              .join(",")
            if (filterValue !== "") {
              advancedFiltersStrArr.push(
                `${filter.name} ${filter.operator} ${filterValue}`,
              )
            }
          }
          return diagnosisServiceGetSlowQueryList(clusterId, {
            beginTime: params.beginTime + "",
            endTime: params.endTime + "",
            db: params.dbs,
            text: params.term,
            orderBy: params.orderBy,
            isDesc: params.desc,
            pageSize: params.limit,
            fields: params.fields.join(","),
            advancedFilter: advancedFiltersStrArr,
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
