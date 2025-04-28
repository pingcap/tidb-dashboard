import {
  AdvancedFiltersUrlState,
  PaginationUrlState,
  SearchUrlState,
  SortUrlState,
  TimeRangeUrlState,
  useAdvancedFiltersUrlState,
  usePaginationUrlState,
  useResetFiltersState,
  useSearchUrlState,
  useSortUrlState,
  useTimeRangeUrlState,
  useUrlState,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useCallback, useEffect, useMemo } from "react"

type ListUrlState = Partial<
  Record<"dbs" | "ruGroups" | "sqlDigest" | "limit" | "cols", string>
> &
  SortUrlState &
  PaginationUrlState &
  TimeRangeUrlState &
  SearchUrlState &
  AdvancedFiltersUrlState

export function useListUrlState() {
  const [queryParams, setQueryParams] = useUrlState<ListUrlState>()
  const { sortRule, setSortRule } = useSortUrlState("query_time")
  const { pagination, setPagination } = usePaginationUrlState()
  const { timeRange, setTimeRange } = useTimeRangeUrlState()
  const { term, setTerm } = useSearchUrlState()
  const { advancedFilters, setAdvancedFilters } = useAdvancedFiltersUrlState()

  // dbs
  const dbs = useMemo<string[]>(() => {
    const _dbs = queryParams.dbs
    return _dbs ? _dbs.split(",") : []
  }, [queryParams.dbs])
  const setDbs = useCallback(
    (v: string[]) => {
      setQueryParams({ dbs: v.join(","), pageIndex: undefined })
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
      setQueryParams({ ruGroups: v.join(","), pageIndex: undefined })
    },
    [setQueryParams],
  )

  // sqlDigest
  const sqlDigest = queryParams.sqlDigest ?? ""
  const setSqlDigest = useCallback(
    (v?: string) => {
      setQueryParams({ sqlDigest: v, pageIndex: undefined })
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
      setQueryParams({ limit: v, pageIndex: undefined })
    },
    [setQueryParams],
  )

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
      pageIndex: undefined,
    })
  }, [setQueryParams])
  const resetVal = useResetFiltersState((s) => s.resetVal)
  useEffect(() => {
    if (resetVal > 0) {
      resetFilters()
    }
  }, [resetVal])

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
