import { useCallback } from "react"

import { PaginationUrlState } from "./pagination-url-state"
import { useUrlState } from "./use-url-state"

export type ResetUrlState = Partial<Record<"_r", string>>

export function useResetUrlState() {
  const [queryParams, setQueryParams] = useUrlState<
    ResetUrlState & PaginationUrlState
  >()

  const resetVal = queryParams._r ?? ""
  const setReset = useCallback(() => {
    let num = Number(resetVal)
    if (isNaN(num)) {
      num = 0
    }
    setQueryParams({
      _r: String(num + 1),
      pageIndex: undefined,
    })
  }, [setQueryParams, resetVal])

  return { resetVal, setReset }
}
