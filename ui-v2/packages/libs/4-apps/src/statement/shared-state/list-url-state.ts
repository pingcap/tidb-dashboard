import {
  AdvancedFiltersUrlState,
  PaginationUrlState,
  SortUrlState,
  TimeRangeUrlState,
  useAdvancedFiltersUrlState,
  usePaginationUrlState,
  useSortUrlState,
  useTimeRangeUrlState,
  useUrlState,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useCallback, useMemo } from "react"

type ListUrlState = Partial<
  Record<"dbs" | "ruGroups" | "kinds" | "term" | "cols", string>
> &
  SortUrlState &
  PaginationUrlState &
  TimeRangeUrlState &
  AdvancedFiltersUrlState

export function useListUrlState() {
  const [queryParams, setQueryParams] = useUrlState<ListUrlState>()
  const { sortRule, setSortRule } = useSortUrlState("sum_latency")
  const { pagination, setPagination } = usePaginationUrlState()
  const { timeRange, setTimeRange } = useTimeRangeUrlState()
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

  // kinds
  const kinds = useMemo(() => {
    const _kinds = queryParams.kinds
    return _kinds ? _kinds.split(",") : []
  }, [queryParams.kinds])
  const setKinds = useCallback(
    (newKinds: string[]) => {
      setQueryParams({ kinds: newKinds.join(","), pageIndex: undefined })
    },
    [setQueryParams],
  )

  // term
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

  // reset filters, not include sort
  const resetFilters = useCallback(() => {
    setQueryParams({
      from: undefined,
      to: undefined,
      dbs: undefined,
      ruGroups: undefined,
      kinds: undefined,
      term: undefined,
      af: undefined,
      pageIndex: undefined,
    })
  }, [setQueryParams])

  // cols
  const cols = useMemo<string[]>(() => {
    const _cols =
      queryParams.cols ||
      "digest_text,sum_latency,avg_latency,exec_count,plan_count"
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

    kinds,
    setKinds,

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
