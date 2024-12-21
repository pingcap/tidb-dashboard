import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAppContext } from "../ctx"

export function useRuGroupsData() {
  const ctx = useAppContext()
  return useQuery({
    queryKey: [ctx.ctxId, "sql-limit", "ru-groups"],
    queryFn: () => ctx.api.getRuGroups(),
  })
}

export function useSqlLimitSupportData() {
  const ctx = useAppContext()
  return useQuery({
    queryKey: [ctx.ctxId, "sql-limit-support"],
    queryFn: () => ctx.api.checkSqlLimitSupport(),
  })
}

export function useSqlLimitStatusData() {
  const ctx = useAppContext()
  return useQuery({
    queryKey: [ctx.ctxId, "sql-limit-status", ctx.sqlDigest],
    queryFn: () => ctx.api.getSqlLimitStatus({ watchText: ctx.sqlDigest }),
  })
}

export function useCreateSqlLimitData() {
  const ctx = useAppContext()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { ruGroup: string; action: string }) => {
      return ctx.api.createSqlLimit({ watchText: ctx.sqlDigest, ...params })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ctx.ctxId, "sql-limit-status", ctx.sqlDigest],
      })
    },
  })
}

export function useDeleteSqlLimitData() {
  const ctx = useAppContext()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => {
      return ctx.api.deleteSqlLimit({ watchText: ctx.sqlDigest })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ctx.ctxId, "sql-limit-status", ctx.sqlDigest],
      })
    },
  })
}
