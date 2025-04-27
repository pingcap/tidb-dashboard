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
            type: res.type ?? "string",
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
          const fieldsStr = params.fields.includes("all")
            ? "*"
            : params.fields.join(",")
          return diagnosisServiceGetSlowQueryList(clusterId, {
            beginTime: params.beginTime + "",
            endTime: params.endTime + "",
            db: params.dbs,
            text: params.term,
            orderBy: params.orderBy,
            isDesc: params.desc,
            advancedFilter: advancedFiltersStrArr,
            fields: fieldsStr,
            pageSize: params.pageSize,
            skip: params.pageSize * params.pageIndex,
          }).then((res) => ({
            total: res.totalSize ?? 0,
            items: res.data ?? [],
          }))
        },
        getSlowQuery(params: { id: string }) {
          const [digest, connectionId, timestamp] = params.id.split(",")
          return diagnosisServiceGetSlowQueryDetail(clusterId, digest, {
            connectionId,
            timestamp: Number(timestamp),
          }).then((d) => {
            if (d.binary_plan_text) {
              d.plan = d.binary_plan_text
              delete d.binary_plan_text
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
          }).then((res) =>
            (res.data || []).map((d) => ({
              id: d.id ?? "",
              ru_group: d.resourceGroupName ?? "",
              action: d.action ?? "",
              start_time: d.startTime ?? "",
            })),
          )
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

        // sql history
        getHistoryMetricNames() {
          return Promise.resolve([
            { name: "query_time", unit: "s" },
            { name: "memory_max", unit: "bytes" },
            { name: "disk_max", unit: "bytes" },
            { name: "parse_time", unit: "s" },
            { name: "compile_time", unit: "s" },
            { name: "rewrite_time", unit: "s" },
            { name: "preproc_subqueries_time", unit: "s" },
            { name: "optimize_time", unit: "s" },
            { name: "cop_time", unit: "s" },
            { name: "wait_time", unit: "s" },
            { name: "process_time", unit: "s" },
            { name: "local_latch_wait_time", unit: "s" },
            { name: "lock_keys_time", unit: "s" },
            { name: "resolve_lock_time", unit: "s" },
            { name: "wait_ts", unit: "s" },
            { name: "get_commit_ts_time", unit: "s" },
            { name: "prewrite_time", unit: "s" },
            { name: "commit_time", unit: "s" },
            { name: "backoff_time", unit: "s" },
            { name: "commit_backoff_time", unit: "s" },
            { name: "exec_retry_time", unit: "s" },
            { name: "write_sql_response_total", unit: "s" },
            { name: "wait_prewrite_binlog_time", unit: "s" },
          ])
        },
        getHistoryMetricData(params) {
          return diagnosisServiceGetSlowQueryList(clusterId, {
            beginTime: params.beginTime + "",
            endTime: params.endTime + "",
            orderBy: "timestamp",
            isDesc: false,
            pageSize: 1000,
            fields: ["timestamp", params.metricName].join(","),
            advancedFilter: [`digest = ${params.sqlDigest}`],
          }).then((res) =>
            (res.data ?? []).map((d) => [
              d.timestamp! * 1000,
              d[params.metricName as keyof typeof d]! as number,
            ]),
          )
        },
      },
      cfg: {
        title: "",
      },
      actions: {
        openDetail: (id: string, newTab: boolean) => {
          window.preUrl = [window.location.pathname + window.location.search]
          if (newTab) {
            window.open(`/slow-query/detail?id=${id}`, "_blank")
          } else {
            navigate({ to: `/slow-query/detail?id=${id}` })
          }
        },
        backToList: () => {
          const preUrl = window.preUrl?.pop()
          navigate({ to: preUrl || "/slow-query" })
        },
        openStatement(id) {
          const [from, to, sqlDigest, dbName] = id.split(",")
          const fullUrl = `/statement?from=${from}&to=${to}&af=digest,${encodeURIComponent("=")},${sqlDigest};schema_name,in,${dbName}`
          window.open(fullUrl, "_blank")
        },
      },
    }),
    [navigate],
  )
}
