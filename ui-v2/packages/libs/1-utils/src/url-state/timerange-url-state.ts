import { useCallback, useMemo } from "react"

import { TimeRange, toURLTimeRange, urlToTimeRange } from "../time-range"

import { PaginationUrlState } from "./pagination-url-state"
import { useUrlState } from "./use-url-state"

export type TimeRangeUrlState = Partial<Record<"from" | "to", string>>

const DEF_TIME_RANGE: TimeRange = {
  type: "relative",
  value: 30 * 60,
}

export function useTimeRangeUrlState(
  defTimeRange?: TimeRange,
  affectPagination?: boolean,
) {
  const [queryParams, setQueryParams] = useUrlState<
    TimeRangeUrlState & PaginationUrlState
  >()

  const timeRange = useMemo(() => {
    const { from, to } = queryParams
    if (from && to) {
      return urlToTimeRange({ from, to })
    }
    return defTimeRange || DEF_TIME_RANGE
  }, [queryParams.from, queryParams.to, defTimeRange])
  const setTimeRange = useCallback(
    (newTimeRange: TimeRange) => {
      setQueryParams({
        ...toURLTimeRange(newTimeRange),
        ...(affectPagination ? { curPage: undefined } : {}),
      })
    },
    [setQueryParams, affectPagination],
  )

  return { timeRange, setTimeRange }
}
