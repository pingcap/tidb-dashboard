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
  diagnosisServiceGetTopSqlAvailableAdvancedFilters,
  diagnosisServiceGetTopSqlAvailableFields,
  diagnosisServiceGetTopSqlConfigs,
  diagnosisServiceGetTopSqlDetail,
  diagnosisServiceGetTopSqlList,
  diagnosisServiceRemoveSqlLimit,
  diagnosisServiceUnbindSqlPlan,
  diagnosisServiceUpdateTopSqlConfigs,
} from "@pingcap-incubator/tidb-dashboard-lib-api-client"
import { AppCtxValue } from "@pingcap-incubator/tidb-dashboard-lib-apps/statement"
import { useNavigate } from "@tanstack/react-router"
import { useMemo } from "react"

import { STMT_TYPES } from "./stmt-types"

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
          return Promise.resolve(STMT_TYPES)
        },
        getDbs() {
          return diagnosisServiceGetTopSqlAvailableAdvancedFilterInfo(
            clusterId,
            "schema_name",
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
          return diagnosisServiceGetTopSqlAvailableAdvancedFilters(
            clusterId,
          ).then((res) => res.filters ?? [])
        },
        getAdvancedFilterInfo(params) {
          if (params.name === "stmt_type") {
            return Promise.resolve({
              name: "stmt_type",
              type: "string",
              unit: "",
              values: STMT_TYPES,
            })
          }
          return diagnosisServiceGetTopSqlAvailableAdvancedFilterInfo(
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
          return diagnosisServiceGetTopSqlAvailableFields(clusterId).then(
            (res) => res.fields ?? [],
          )
        },

        // config
        getStmtConfig() {
          return diagnosisServiceGetTopSqlConfigs(clusterId).then((res) => ({
            enable: res.enable!,
            max_size: res.maxSize!,
            refresh_interval: res.refreshInterval!,
            history_size: res.historySize!,
            internal_query: res.internalQuery!,
          }))
        },
        updateStmtConfig(params) {
          return diagnosisServiceUpdateTopSqlConfigs(clusterId, {
            enable: params.enable,
            refreshInterval: params.refresh_interval,
            historySize: params.history_size,
            maxSize: params.max_size,
            internalQuery: params.internal_query,
          }).then(() => {})
        },

        getStmtList(params) {
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
          return diagnosisServiceGetTopSqlList(clusterId, {
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
            planDigest: params.plans.filter(Boolean),
          }).then((d) => {
            if (d.binary_plan_text) {
              d.plan = d.binary_plan_text
              delete d.binary_plan_text
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
          }).then((res) => (res.data ?? []).map((d) => d.planDigest!))
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
            { name: "sum_latency", unit: "ns" },
            { name: "avg_latency", unit: "ns" },
            { name: "max_latency", unit: "ns" },
            { name: "min_latency", unit: "ns" },
            { name: "avg_disk", unit: "bytes" },
            { name: "max_disk", unit: "bytes" },
            { name: "exec_count", unit: "short" },
            { name: "plan_count", unit: "short" },
            { name: "avg_parse_latency", unit: "ns" },
            { name: "avg_compile_latency", unit: "ns" },
            { name: "avg_wait_time", unit: "ns" },
            { name: "avg_process_time", unit: "ns" },
            { name: "avg_backoff_time", unit: "ns" },
            { name: "avg_get_commit_ts_time", unit: "ns" },
            { name: "avg_local_latch_wait_time", unit: "ns" },
            { name: "avg_resolve_lock_time", unit: "ns" },
            { name: "avg_prewrite_time", unit: "ns" },
            { name: "avg_commit_time", unit: "ns" },
            { name: "avg_commit_backoff_time", unit: "ns" },
          ])
        },
        getHistoryMetricData(params) {
          return diagnosisServiceGetTopSqlList(clusterId, {
            beginTime: params.beginTime + "",
            endTime: params.endTime + "",
            orderBy: "summary_begin_time",
            isDesc: false,
            pageSize: 1000,
            fields: ["summary_begin_time", params.metricName].join(","),
            advancedFilter: [`digest = ${params.sqlDigest}`],
            isGroupByTime: true,
          }).then((res) =>
            (res.data ?? []).map((d) => [
              d.summary_begin_time! * 1000,
              d[params.metricName as keyof typeof d]! as number,
            ]),
          )
        },
      },
      cfg: {
        title: "",
      },
      actions: {
        openDetail: (id: string, newTab) => {
          window.preUrl = [window.location.pathname + window.location.search]
          if (newTab) {
            window.open(`/statement/detail?id=${id}`, "_blank")
          } else {
            navigate({ to: `/statement/detail?id=${id}` })
          }
        },
        backToList: () => {
          const preUrl = window.preUrl?.pop()
          navigate({ to: preUrl || "/statement" })
        },
        openSlowQueryList(id) {
          const [from, to, digest, _schema, plan] = id.split(",")
          const fullUrl = `/slow-query?from=${from}&to=${to}&af=digest,${encodeURIComponent("=")},${digest};plan_digest,${encodeURIComponent("=")},${plan || ""}`

          // open in a new tab
          window.open(fullUrl, "_blank")
        },
      },
    }),
    [navigate],
  )
}
