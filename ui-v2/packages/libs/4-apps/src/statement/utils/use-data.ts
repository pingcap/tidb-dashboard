import { toTimeRangeValue } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useQuery } from "@tanstack/react-query"

import { useAppContext } from "../ctx"
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
  const { timeRange, dbs, ruGroups, kinds, term, sortRule } = useListUrlState()

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
      // sort in local, so no need to use sortRule as dependencies
    ],
    queryFn: () => {
      const tr = toTimeRangeValue(timeRange)
      return ctx.api.getStmtList({
        beginTime: tr[0],
        endTime: tr[1],
        dbs,
        ruGroups,
        stmtKinds: kinds,
        term,
        ...sortRule,
      })
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
