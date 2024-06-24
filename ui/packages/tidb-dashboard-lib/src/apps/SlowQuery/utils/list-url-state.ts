import { useCallback, useMemo } from 'react'
import useUrlState from '@ahooksjs/use-url-state'
import {
  DEFAULT_TIME_RANGE,
  TimeRange,
  toURLTimeRange,
  urlToTimeRange
} from '@lib/components/TimeRangeSelector'

type ListUrlState = Partial<
  Record<
    | 'from'
    | 'to'
    | 'dbs'
    | 'digest'
    | 'ru_groups'
    | 'term'
    | 'limit'
    | 'fields'
    | 'full_sql'
    | 'order'
    | 'row',
    string
  >
>

type OrderOpt = {
  col: string
  type: 'asc' | 'desc'
}

export function useSlowQueryListUrlState() {
  const [queryParams, setQueryParams] = useUrlState<ListUrlState>()

  // from & to
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
    [setQueryParams]
  )

  // dbs
  const dbs = useMemo<string[]>(() => {
    const dbs = queryParams.dbs
    return dbs ? dbs.split(',') : []
  }, [queryParams.dbs])
  const setDbs = useCallback(
    (v: string[]) => {
      setQueryParams({ dbs: v.join(',') })
    },
    [setQueryParams]
  )

  // digest
  const digest = queryParams.digest ?? ''
  const setDigest = useCallback(
    (v: string) => {
      setQueryParams({ digest: v })
    },
    [setQueryParams]
  )

  // ru_groups
  const ruGroups = useMemo(() => {
    const ruGroups = queryParams.ru_groups
    return ruGroups ? ruGroups.split(',') : []
  }, [queryParams.ru_groups])
  const setRuGroups = useCallback(
    (v: string[]) => {
      setQueryParams({ ru_groups: v.join(',') })
    },
    [setQueryParams]
  )

  // term
  const term = queryParams.term ?? ''
  const setTerm = useCallback(
    (v: string) => {
      setQueryParams({ term: v })
    },
    [setQueryParams]
  )

  // limit
  const limit = parseInt(queryParams.limit ?? '100')
  const setLimit = useCallback(
    (v: number) => {
      setQueryParams({ limit: v.toString() })
    },
    [setQueryParams]
  )

  // order
  const order = useMemo<OrderOpt>(() => {
    const _order = queryParams.order ?? '-timestamp'
    let type: 'asc' | 'desc' = 'asc'
    let col = _order
    if (col.startsWith('-')) {
      col = col.slice(1)
      type = 'desc'
    }
    return { col, type }
  }, [queryParams.order])
  const setOrder = useCallback(
    (v: OrderOpt) => {
      setQueryParams({ order: v.type === 'asc' ? v.col : '-' + v.col })
    },
    [setQueryParams]
  )
  const resetOrder = useCallback(() => {
    setQueryParams({ order: undefined })
  }, [setQueryParams])

  // row
  const rowIdx = useMemo(() => {
    const r = parseInt(queryParams.row)
    if (r >= 0) return r
    return -1
  }, [queryParams.row])
  const setRowIdx = useCallback(
    (v: number) => {
      setQueryParams({ row: v + '' })
    },
    [setQueryParams]
  )

  return {
    queryParams,
    setQueryParams,

    timeRange,
    setTimeRange,

    dbs,
    setDbs,

    digest,
    setDigest,

    ruGroups,
    setRuGroups,

    term,
    setTerm,

    limit,
    setLimit,

    order,
    setOrder,
    resetOrder,

    rowIdx,
    setRowIdx
  }
}
