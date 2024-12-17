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
  const { timeRange, dbs, ruGroups, limit, term, sortRule } = useListUrlState()

  const query = useQuery({
    queryKey: [
      ctx.ctxId,
      "slow-query",
      "list",
      timeRange,
      dbs,
      ruGroups,
      limit,
      term,
      sortRule,
    ],
    queryFn: () => {
      const tr = toTimeRangeValue(timeRange)
      return ctx.api.getSlowQueries({
        beginTime: tr[0],
        endTime: tr[1],
        dbs,
        ruGroups,
        limit,
        term,
        ...sortRule,
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
    enabled: !!id,
  })
  return query
}
