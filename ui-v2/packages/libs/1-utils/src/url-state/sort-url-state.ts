import { useCallback, useMemo } from "react"

import { PaginationUrlState } from "./pagination-url-state"
import { useUrlState } from "./use-url-state"

export type SortRule = {
  orderBy: string
  desc: boolean
}

export type SortUrlState = Partial<Record<"orderBy" | "desc", string>>

export function useSortUrlState(
  defOrderBy: string = "",
  affectPagination: boolean = false,
) {
  const [queryParams, setQueryParams] = useUrlState<
    SortUrlState & PaginationUrlState
  >()

  const sortRule = useMemo<SortRule>(() => {
    return {
      orderBy: queryParams.orderBy ?? defOrderBy,
      desc: queryParams.desc !== "false",
    }
  }, [queryParams.orderBy, queryParams.desc])
  const setSortRule = useCallback(
    (newSortRule: SortRule) => {
      setQueryParams({
        orderBy: newSortRule.orderBy || undefined,
        desc: newSortRule.desc ? undefined : "false",
        ...(affectPagination ? { curPage: undefined } : {}),
      })
    },
    [setQueryParams],
  )

  return { sortRule, setSortRule }
}
