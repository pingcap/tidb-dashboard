import { useQuery } from "@tanstack/react-query"

import { useAppContext } from "../ctx/context"
import { useDetailUrlState } from "../url-state/detail-url-state"
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
      return ctx.api.getStmtList({ term })
    },
  })

  return query
}

export function usePlansListData() {
  const ctx = useAppContext()
  const { id } = useDetailUrlState()
  return useQuery({
    queryKey: [ctx.ctxId, "statement", "plans-list", id],
    queryFn: () => ctx.api.getStmtPlans({ id }),
  })
}

export function usePlansDetailData() {
  const ctx = useAppContext()
  const { id, plans } = useDetailUrlState()
  return useQuery({
    queryKey: [ctx.ctxId, "statement", "plans-detail", id, plans],
    queryFn: () => ctx.api.getStmtPlansDetail({ id, plans }),
    enabled: plans.length > 0 && plans[0] !== "empty",
  })
}
