import { toTimeRangeValue } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useQuery } from "@tanstack/react-query"

import { useAppContext } from "../ctx"
import { useDetailUrlState } from "../shared-state/detail-url-state"
import { useListUrlState } from "../shared-state/list-url-state"
import { useTimeRangeValueState } from "../shared-state/memory-state"

import { MAX_TIME_RANGE_DURATION_SECONDS } from "./constants"

export function useDbsData() {
  const ctx = useAppContext()
  return useQuery({
    queryKey: [ctx.ctxId, "slow-query", "dbs"],
    queryFn: () => ctx.api.getDbs(),
  })
}

export function useRuGroupsData() {
  const ctx = useAppContext()
  return useQuery({
    queryKey: [ctx.ctxId, "slow-query", "ru-groups"],
    queryFn: () => ctx.api.getRuGroups(),
  })
}

export function useListData() {
  const ctx = useAppContext()
  const {
    timeRange,
    dbs,
    ruGroups,
    sqlDigest,
    limit,
    term,
    sortRule,
    advancedFilters,
    cols,
    pagination,
  } = useListUrlState()
  const setTRV = useTimeRangeValueState((s) => s.setTRV)

  const query = useQuery({
    queryKey: [
      ctx.ctxId,
      "slow-query",
      "list",
      timeRange,
      dbs,
      ruGroups,
      sqlDigest,
      term,
      advancedFilters,
      cols,
      limit,
      sortRule,
      pagination,
    ],
    queryFn: () => {
      const tr = toTimeRangeValue(timeRange)
      const beginTime = tr[0]
      let endTime = tr[1]
      const beyondMax = endTime - beginTime > MAX_TIME_RANGE_DURATION_SECONDS
      if (beyondMax) {
        endTime = beginTime + MAX_TIME_RANGE_DURATION_SECONDS
      }
      setTRV([beginTime, endTime], beyondMax)
      return ctx.api.getSlowQueries({
        beginTime,
        endTime,
        dbs,
        ruGroups,
        sqlDigest,
        limit,
        term,
        advancedFilters,
        fields: cols.filter((c) => c !== "empty"),
        ...sortRule,
        ...pagination,
      })
    },
  })

  return query
}

export function useDetailData() {
  const ctx = useAppContext()
  const { id } = useDetailUrlState()

  const query = useQuery({
    queryKey: [ctx.ctxId, "slow-query", "detail", id],
    queryFn: () => {
      return ctx.api.getSlowQuery({ id })
    },
  })
  return query
}

// advanced filters
export function useAdvancedFilterNamesData() {
  const ctx = useAppContext()
  return useQuery({
    queryKey: [ctx.ctxId, "slow-query", "advanced-filter-names"],
    queryFn: () => ctx.api.getAdvancedFilterNames(),
  })
}

export function useAdvancedFilterInfoData(name: string) {
  const ctx = useAppContext()
  return useQuery({
    queryKey: [ctx.ctxId, "slow-query", "advanced-filter-info", name],
    queryFn: () => ctx.api.getAdvancedFilterInfo({ name }),
    enabled: !!name,
  })
}

// available fields
export function useAvailableFieldsData() {
  const ctx = useAppContext()
  return useQuery({
    queryKey: [ctx.ctxId, "slow-query", "available-fields"],
    queryFn: () => ctx.api.getAvailableFields(),
  })
}
