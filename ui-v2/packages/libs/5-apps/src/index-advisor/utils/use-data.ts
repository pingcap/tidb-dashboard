import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useIndexAdvisorContext } from "../ctx/context"
import { useIndexAdvisorUrlState } from "../url-state/list-url-state"

export function useAdvisorsSummaryData() {
  const ctx = useIndexAdvisorContext()

  const query = useQuery({
    queryKey: ["index_advisors_summary", ctx.ctxId],
    queryFn: () => {
      return ctx.api.getAdvisorsSummary()
    },
    refetchOnWindowFocus: false,
  })
  return query
}

export function useAdvisorsData() {
  const ctx = useIndexAdvisorContext()
  const { status, search, sortRule, pagination } = useIndexAdvisorUrlState()

  const query = useQuery({
    queryKey: [
      "index_advisors",
      ctx.ctxId,
      status,
      search,
      `${sortRule.orderBy}_${sortRule.desc}`,
      `${pagination.curPage}_${pagination.pageSize}`,
    ],
    queryFn: () => {
      return ctx.api.getAdvisors({
        status,
        search,
        orderBy: sortRule.orderBy,
        desc: sortRule.desc,
        curPage: pagination.curPage,
        pageSize: pagination.pageSize,
      })
    },
    refetchOnWindowFocus: false,
  })
  return query
}

export function useAdvisorData(advisorId?: string) {
  const ctx = useIndexAdvisorContext()

  const query = useQuery({
    queryKey: ["index_advisor", ctx.ctxId, advisorId],
    queryFn: () => {
      return ctx.api.getAdvisor({ advisorId: advisorId! })
    },
    refetchOnWindowFocus: false,
    enabled: !!advisorId,
  })

  return query
}

export function useApplyAdvisor() {
  const ctx = useIndexAdvisorContext()
  const queryClient = useQueryClient()
  const { applyId } = useIndexAdvisorUrlState()

  return useMutation({
    mutationFn: (advisorId: string) => {
      return ctx.api.applyAdvisor({ advisorId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["index_advisors", ctx.ctxId] })
      queryClient.invalidateQueries({
        queryKey: ["index_advisor", ctx.ctxId, applyId],
      })
    },
  })
}

export function useCloseAdvisor() {
  const ctx = useIndexAdvisorContext()
  const queryClient = useQueryClient()
  const { closeId } = useIndexAdvisorUrlState()

  return useMutation({
    mutationFn: (advisorId: string) => {
      return ctx.api.closeAdvisor({ advisorId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["index_advisors", ctx.ctxId] })
      queryClient.invalidateQueries({
        queryKey: ["index_advisor", ctx.ctxId, closeId],
      })
    },
  })
}

export function useGenAdvisor() {
  const ctx = useIndexAdvisorContext()
  return useMutation({
    mutationFn: (sql: string) => {
      return ctx.api.genAdvisor({ sql })
    },
  })
}
