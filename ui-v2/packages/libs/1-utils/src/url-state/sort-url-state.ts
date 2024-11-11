import { useCallback, useMemo } from "react"

import { useUrlState } from "./use-url-state"

export type SortRule = {
  orderBy: string
  desc: boolean
}

export type SortUrlState = Partial<Record<"orderBy" | "desc", string>>

export function useSortUrlState() {
  const [queryParams, setQueryParams] = useUrlState<SortUrlState>()

  const sortRule = useMemo<SortRule>(() => {
    return {
      orderBy: queryParams.orderBy ?? "",
      desc: queryParams.desc !== "false",
    }
  }, [queryParams.orderBy, queryParams.desc])
  const setSortRule = useCallback(
    (newSortRule: SortRule) => {
      setQueryParams({
        orderBy: newSortRule.orderBy || undefined,
        desc: newSortRule.desc ? undefined : "false",
      })
    },
    [setQueryParams],
  )

  return { sortRule, setSortRule }
}
