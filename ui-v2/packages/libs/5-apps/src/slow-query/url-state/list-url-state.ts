import { TimeRange } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  SortUrlState,
  TimeRangeUrlState,
  useSortUrlState,
  useTimeRangeUrlState,
  useUrlState,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useCallback, useMemo } from "react"

type ListUrlState = Partial<
  Record<"dbs" | "ruGroups" | "limit" | "term", string>
> &
  SortUrlState &
  TimeRangeUrlState

export const DEFAULT_TIME_RANGE: TimeRange = {
  type: "relative",
  value: 30 * 60,
}

export function useListUrlState() {
  const [queryParams, setQueryParams] = useUrlState<ListUrlState>()
  const { sortRule, setSortRule } = useSortUrlState()
  const { timeRange, setTimeRange } = useTimeRangeUrlState(DEFAULT_TIME_RANGE)

  // dbs
  const dbs = useMemo<string[]>(() => {
    const _dbs = queryParams.dbs
    return _dbs ? _dbs.split(",") : []
  }, [queryParams.dbs])
  const setDbs = useCallback(
    (v: string[]) => {
      setQueryParams({ dbs: v.join(",") })
    },
    [setQueryParams],
  )

  // ruGroups
  const ruGroups = useMemo(() => {
    const _ruGroups = queryParams.ruGroups
    return _ruGroups ? _ruGroups.split(",") : []
  }, [queryParams.ruGroups])
  const setRuGroups = useCallback(
    (v: string[]) => {
      setQueryParams({ ruGroups: v.join(",") })
    },
    [setQueryParams],
  )

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

  // reset filters, not include sort
  const resetFilters = useCallback(() => {
    setQueryParams({
      from: undefined,
      to: undefined,
      dbs: undefined,
      ruGroups: undefined,
      limit: undefined,
      term: undefined,
    })
  }, [setQueryParams])

  return {
    timeRange,
    setTimeRange,

    dbs,
    setDbs,

    ruGroups,
    setRuGroups,

    limit,
    setLimit,

    term,
    setTerm,

    resetFilters,

    sortRule,
    setSortRule,

    queryParams,
    setQueryParams,
  }
}
