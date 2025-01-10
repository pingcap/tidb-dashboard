import { toTimeRangeValue } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAppContext } from "../ctx"
import { useDetailUrlState } from "../shared-state/detail-url-state"
import { useListUrlState } from "../shared-state/list-url-state"

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
  const {
    timeRange,
    dbs,
    ruGroups,
    kinds,
    term,
    sortRule,
    advancedFilters,
    cols,
  } = useListUrlState()

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
      advancedFilters,
      cols,
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
        advancedFilters,
        fields: cols.filter((c) => c !== "empty"),
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

export function usePlanDetailData(plan: string) {
  const ctx = useAppContext()
  const { id } = useDetailUrlState()
  return useQuery({
    queryKey: [ctx.ctxId, "statement", "plan-detail", id, plan],
    queryFn: () =>
      ctx.api.getStmtPlansDetail({
        id,
        plans: [plan],
      }),
  })
}

// sql plan bind
export function usePlanBindSupportData() {
  const ctx = useAppContext()
  return useQuery({
    queryKey: [ctx.ctxId, "statement", "plan-bind-support"],
    queryFn: () => ctx.api.checkPlanBindSupport(),
  })
}

export function usePlanBindStatusData(
  sqlDigest: string,
  beginTime: number,
  endTime: number,
) {
  const ctx = useAppContext()
  return useQuery({
    queryKey: [
      ctx.ctxId,
      "statement",
      "plan-bind-status",
      sqlDigest,
      beginTime,
      endTime,
    ],
    queryFn: () => ctx.api.getPlanBindStatus({ sqlDigest, beginTime, endTime }),
  })
}

export function useCreatePlanBindData(sqlDigest: string, planDigest: string) {
  const ctx = useAppContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      return ctx.api.createPlanBind({ planDigest })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ctx.ctxId, "statement", "plan-bind-status", sqlDigest],
      })
    },
  })
}

export function useDeletePlanBindData(sqlDigest: string) {
  const ctx = useAppContext()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => {
      return ctx.api.deletePlanBind({ sqlDigest })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ctx.ctxId, "statement", "plan-bind-status", sqlDigest],
      })
    },
  })
}

// advanced filters
export function useAdvancedFilterNamesData() {
  const ctx = useAppContext()
  return useQuery({
    queryKey: [ctx.ctxId, "statement", "advanced-filter-names"],
    queryFn: () => ctx.api.getAdvancedFilterNames(),
  })
}

export function useAdvancedFilterInfoData(name: string) {
  const ctx = useAppContext()
  return useQuery({
    queryKey: [ctx.ctxId, "statement", "advanced-filter-info", name],
    queryFn: () => ctx.api.getAdvancedFilterInfo({ name }),
    enabled: !!name,
  })
}

// available fields
export function useAvailableFieldsData() {
  const ctx = useAppContext()
  return useQuery({
    queryKey: [ctx.ctxId, "statement", "available-fields"],
    queryFn: () => ctx.api.getAvailableFields(),
  })
}
