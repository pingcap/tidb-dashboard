import {
  AdvancedFiltersUrlState,
  PaginationUrlState,
  SortUrlState,
  TimeRange,
  TimeRangeUrlState,
  useAdvancedFiltersUrlState,
  usePaginationUrlState,
  useSortUrlState,
  useTimeRangeUrlState,
  useUrlState,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useCallback, useMemo } from "react"

type ListUrlState = Partial<
  Record<"dbs" | "ruGroups" | "sqlDigest" | "limit" | "term" | "cols", string>
> &
  SortUrlState &
  PaginationUrlState &
  TimeRangeUrlState &
  AdvancedFiltersUrlState

export const DEFAULT_TIME_RANGE: TimeRange = {
  type: "relative",
  value: 30 * 60,
}

export function useListUrlState() {
  const [queryParams, setQueryParams] = useUrlState<ListUrlState>()
  const { sortRule, setSortRule } = useSortUrlState("query_time", true)
  const { pagination, setPagination } = usePaginationUrlState()
  const { timeRange, setTimeRange } = useTimeRangeUrlState(DEFAULT_TIME_RANGE)
  const { advancedFilters, setAdvancedFilters } =
    useAdvancedFiltersUrlState(true)

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
  const term = decodeURIComponent(queryParams.term ?? "")
  const setTerm = useCallback(
    (v?: string) => {
      setQueryParams({
        term: v ? encodeURIComponent(v) : v,
        curPage: undefined,
      })
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
      af: undefined,
      limit: undefined,
      term: undefined,
      curPage: undefined,
    })
  }, [setQueryParams])

  // cols
  const cols = useMemo<string[]>(() => {
    const _cols = queryParams.cols || "query,timestamp,query_time,memory_max"
    return _cols ? _cols.split(",") : []
  }, [queryParams.cols])
  const setCols = useCallback(
    (v: string[]) => {
      setQueryParams({ cols: v.join(",") })
    },
    [setQueryParams],
  )

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

    advancedFilters,
    setAdvancedFilters,

    resetFilters,

    sortRule,
    setSortRule,
    pagination,
    setPagination,

    cols,
    setCols,

    queryParams,
    setQueryParams,
  }
}
