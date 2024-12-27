import { toTimeRangeValue } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useQuery } from "@tanstack/react-query"

import { useAppContext } from "../ctx"
import { useDetailUrlState } from "../url-state/detail-url-state"
import { useListUrlState } from "../url-state/list-url-state"

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
  } = useListUrlState()

  const query = useQuery({
    queryKey: [
      ctx.ctxId,
      "slow-query",
      "list",
      timeRange,
      dbs,
      ruGroups,
      sqlDigest,
      limit,
      term,
      sortRule,
      advancedFilters,
      cols,
    ],
    queryFn: () => {
      const tr = toTimeRangeValue(timeRange)
      return ctx.api.getSlowQueries({
        beginTime: tr[0],
        endTime: tr[1],
        dbs,
        ruGroups,
        sqlDigest,
        limit,
        term,
        ...sortRule,
        advancedFilters,
        fields: cols.filter((c) => c !== "empty"),
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
