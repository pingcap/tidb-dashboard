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

export function useSqlLimitStatusData(watchText: string) {
  const ctx = useAppContext()
  return useQuery({
    queryKey: [ctx.ctxId, "sql-limit-status", watchText],
    queryFn: () => ctx.api.getSqlLimitStatus({ watchText }),
  })
}

export function useCreateSqlLimitData(watchText: string) {
  const ctx = useAppContext()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { ruGroup: string; action: string }) => {
      return ctx.api.createSqlLimit({ watchText, ...params })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ctx.ctxId, "sql-limit-status", watchText],
      })
    },
  })
}

export function useDeleteSqlLimitData(watchText: string) {
  const ctx = useAppContext()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => {
      return ctx.api.deleteSqlLimit({ watchText })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ctx.ctxId, "sql-limit-status", watchText],
      })
    },
  })
}
