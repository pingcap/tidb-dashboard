import { useUrlState } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useCallback, useMemo } from "react"

type ListUrlState = Partial<Record<"limit" | "term", string>>

export function useListUrlState() {
  const [queryParams, setQueryParams] = useUrlState<ListUrlState>()

  // limit
  const limit = useMemo(() => {
    const s = queryParams.limit ?? "100"
    const v = parseInt(s)
    if (isNaN(v)) {
      return 100
    }
    return v
  }, [queryParams.limit])
  const setLimit = useCallback(
    (v: string) => {
      setQueryParams({ limit: v })
    },
    [setQueryParams],
  )

  // term
  const term = queryParams.term ?? ""
  const setTerm = useCallback(
    (v?: string) => {
      setQueryParams({ term: v })
    },
    [setQueryParams],
  )

  const reset = useCallback(() => {
    setQueryParams({ limit: undefined, term: undefined })
  }, [setQueryParams])

  return {
    term,
    setTerm,

    limit,
    setLimit,

    reset,

    queryParams,
    setQueryParams,
  }
}
