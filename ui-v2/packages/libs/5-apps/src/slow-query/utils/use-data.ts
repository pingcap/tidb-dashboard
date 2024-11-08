import { useQuery } from "@tanstack/react-query"

import { useAppContext } from "../cxt/context"
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
      return ctx.api.getSlowQueries({ limit, term })
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
