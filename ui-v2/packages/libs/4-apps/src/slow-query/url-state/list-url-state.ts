import {
  PaginationUrlState,
  SortUrlState,
  TimeRange,
  TimeRangeUrlState,
  usePaginationUrlState,
  useSortUrlState,
  useTimeRangeUrlState,
  useUrlState,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useCallback, useMemo } from "react"

type ListUrlState = Partial<
  Record<"dbs" | "ruGroups" | "sqlDigest" | "limit" | "term", string>
> &
  SortUrlState &
  PaginationUrlState &
  TimeRangeUrlState

export const DEFAULT_TIME_RANGE: TimeRange = {
  type: "relative",
  value: 30 * 60,
}

export function useListUrlState() {
  const [queryParams, setQueryParams] = useUrlState<ListUrlState>()
  const { sortRule, setSortRule } = useSortUrlState("timestamp", true)
  const { pagination, setPagination } = usePaginationUrlState(20)
  const { timeRange, setTimeRange } = useTimeRangeUrlState(DEFAULT_TIME_RANGE)

  // dbs
  const dbs = useMemo<string[]>(() => {
    const _dbs = queryParams.dbs
    return _dbs ? _dbs.split(",") : []
  }, [queryParams.dbs])
  const setDbs = useCallback(
    (v: string[]) => {
      setQueryParams({ dbs: v.join(","), curPage: undefined })
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
      setQueryParams({ ruGroups: v.join(","), curPage: undefined })
    },
    [setQueryParams],
  )

  // sqlDigest
  const sqlDigest = queryParams.sqlDigest ?? ""
  const setSqlDigest = useCallback(
    (v?: string) => {
      setQueryParams({ sqlDigest: v, curPage: undefined })
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
      setQueryParams({ limit: v, curPage: undefined })
    },
    [setQueryParams],
  )

  // term
  const term = queryParams.term ?? ""
  const setTerm = useCallback(
    (v?: string) => {
      setQueryParams({ term: v, curPage: undefined })
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
      sqlDigest: undefined,
      limit: undefined,
      term: undefined,
      curPage: undefined,
    })
  }, [setQueryParams])

  return {
    timeRange,
    setTimeRange,

    dbs,
    setDbs,

    ruGroups,
    setRuGroups,

    sqlDigest,
    setSqlDigest,

    limit,
    setLimit,

    term,
    setTerm,

    resetFilters,

    sortRule,
    setSortRule,
    pagination,
    setPagination,

    queryParams,
    setQueryParams,
  }
}
