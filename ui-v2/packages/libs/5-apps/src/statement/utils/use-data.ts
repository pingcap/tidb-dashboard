import { useQuery } from "@tanstack/react-query"

import { useAppContext } from "../ctx/context"
import { useListUrlState } from "../url-state/list-url-state"

export function useDbsData() {
  const ctx = useAppContext()
  return useQuery({
    queryKey: [ctx.ctxId, "statement", "dbs"],
    queryFn: () => ctx.api.getDbs(),
  })
}

export function useRuGroupsData() {
  const ctx = useAppContext()
  return useQuery({
    queryKey: [ctx.ctxId, "statement", "ru-groups"],
    queryFn: () => ctx.api.getRuGroups(),
  })
}

export function useStmtKindsData() {
  const ctx = useAppContext()
  return useQuery({
    queryKey: [ctx.ctxId, "statement", "stmt-kinds"],
    queryFn: () => ctx.api.getStmtKinds(),
  })
}

export function useListData() {
  const ctx = useAppContext()
  const { timeRange, dbs, ruGroups, kinds, term } = useListUrlState()

  const query = useQuery({
    queryKey: [
      ctx.ctxId,
      "statement",
      "list",
      timeRange,
      dbs,
      ruGroups,
      kinds,
      term,
    ],
    queryFn: () => {
      return ctx.api.getStmtList({})
    },
  })

  return query
}
