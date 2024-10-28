import { useQuery } from "@tanstack/react-query"

import { useAppContext } from "../cxt/context"
import { useDetailUrlState } from "../url-state/detail-url-state"
import { useListUrlState } from "../url-state/list-url-state"

export function useListData() {
  const ctx = useAppContext()
  const { limit, term } = useListUrlState()

  const query = useQuery({
    queryKey: [ctx.ctxId, "slow-query", "list", limit, term],
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
