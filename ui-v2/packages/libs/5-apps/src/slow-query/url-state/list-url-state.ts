import {
  TimeRange,
  toURLTimeRange,
  urlToTimeRange,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useUrlState } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useCallback, useMemo } from "react"

export type SortRule = {
  orderBy: string
  desc: boolean
}

type ListUrlState = Partial<
  Record<
    "from" | "to" | "dbs" | "ruGroups" | "limit" | "term" | "orderBy" | "desc",
    string
  >
>

export const DEFAULT_TIME_RANGE: TimeRange = {
  type: "relative",
  value: 30 * 60,
}

export function useListUrlState() {
  const [queryParams, setQueryParams] = useUrlState<ListUrlState>()

  // timeRange
  const timeRange = useMemo(() => {
    const { from, to } = queryParams
    if (from && to) {
      return urlToTimeRange({ from, to })
    }
    return DEFAULT_TIME_RANGE
  }, [queryParams.from, queryParams.to])
  const setTimeRange = useCallback(
    (newTimeRange: TimeRange) => {
      setQueryParams({ ...toURLTimeRange(newTimeRange) })
    },
    [setQueryParams],
  )

  // dbs
  const dbs = useMemo<string[]>(() => {
    const dbs = queryParams.dbs
    return dbs ? dbs.split(",") : []
  }, [queryParams.dbs])
  const setDbs = useCallback(
    (v: string[]) => {
      setQueryParams({ dbs: v.join(",") })
    },
    [setQueryParams],
  )

  // ruGroups
  const ruGroups = useMemo(() => {
    const ruGroups = queryParams.ruGroups
    return ruGroups ? ruGroups.split(",") : []
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

  // sort
  const sortRule = useMemo<SortRule>(() => {
    return {
      orderBy: queryParams.orderBy ?? "timestamp",
      desc: queryParams.desc !== "false",
    }
  }, [queryParams.orderBy, queryParams.desc])
  const setSortRule = useCallback(
    (newSortRule: SortRule) => {
      setQueryParams({
        orderBy: newSortRule.orderBy || undefined,
        desc: newSortRule.desc ? "true" : "false",
      })
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
