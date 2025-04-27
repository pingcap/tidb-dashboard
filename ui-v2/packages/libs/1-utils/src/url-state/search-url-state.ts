import { useCallback } from "react"

import { PaginationUrlState } from "./pagination-url-state"
import { useUrlState } from "./use-url-state"

export type SearchUrlState = Partial<Record<"term", string>>

export function useSearchUrlState() {
  const [queryParams, setQueryParams] = useUrlState<
    SearchUrlState & PaginationUrlState
  >()

  const term = decodeURIComponent(queryParams.term ?? "")
  const setTerm = useCallback(
    (v?: string) => {
      setQueryParams({
        term: v ? encodeURIComponent(v) : v,
        pageIndex: undefined,
      })
    },
    [setQueryParams],
  )

  return { term, setTerm }
}
