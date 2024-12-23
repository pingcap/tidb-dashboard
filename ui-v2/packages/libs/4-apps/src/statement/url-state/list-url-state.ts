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
  Record<"dbs" | "ruGroups" | "kinds" | "term", string>
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
  const { sortRule, setSortRule } = useSortUrlState("sum_latency", true)
  const { pagination, setPagination } = usePaginationUrlState(20)
  const { timeRange, setTimeRange } = useTimeRangeUrlState(
    DEFAULT_TIME_RANGE,
    true,
  )

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

  // kinds
  const kinds = useMemo(() => {
    const _kinds = queryParams.kinds
    return _kinds ? _kinds.split(",") : []
  }, [queryParams.kinds])
  const setKinds = useCallback(
    (newKinds: string[]) => {
      setQueryParams({ kinds: newKinds.join(","), curPage: undefined })
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
      kinds: undefined,
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

    kinds,
    setKinds,

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
