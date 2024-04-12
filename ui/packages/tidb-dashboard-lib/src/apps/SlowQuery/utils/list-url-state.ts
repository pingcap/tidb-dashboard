import { useCallback, useMemo } from 'react'
import useUrlState from '@ahooksjs/use-url-state'
import {
  DEFAULT_TIME_RANGE,
  TimeRange,
  toURLTimeRange,
  urlToTimeRange
} from '@lib/components/TimeRangeSelector'
import { useVersionedLocalStorageState } from '@lib/utils/useVersionedLocalStorageState'
import { DEF_SLOW_QUERY_COLUMN_KEYS } from './helpers'

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
    | 'order',
    string
  >
>

type OrderOpt = {
  col: string
  type: 'asc' | 'desc'
}

const SLOW_QUERY_VISIBLE_COLUMN_KEYS = 'slow_query.visible_column_keys'
const SLOW_QUERY_SHOW_FULL_SQL = 'slow_query.show_full_sql'

export function useSlowQueryListUrlState() {
  const [queryParams, setQueryParams] = useUrlState<ListUrlState>()

  const [visibleColumnKeys, setVisibleColumnKeys] =
    useVersionedLocalStorageState(SLOW_QUERY_VISIBLE_COLUMN_KEYS, {
      defaultValue: DEF_SLOW_QUERY_COLUMN_KEYS
    })
  const [showFullSQL, setShowFullSQL] = useVersionedLocalStorageState(
    SLOW_QUERY_SHOW_FULL_SQL,
    { defaultValue: false }
  )

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
  const dbs = useMemo(() => {
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

  // fields
  // const fields = useMemo(() => {
  //   const fields = queryParams.fields
  //   return fields ? fields.split(',') : []
  // }, [queryParams.fields])
  // const setFields = useCallback((v: string[]) => {
  //   setQueryParams({ fields: v.join(',') })
  // }, [setQueryParams])

  // full_sql
  // const fullSql = queryParams.full_sql === 'true'
  // const setFullSql = useCallback((v: boolean) => {
  //   setQueryParams({ full_sql: v.toString() })
  // }, [setQueryParams])

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

    // fields,
    // setFields,

    // fullSql,
    // setFullSql,

    order,
    setOrder,
    resetOrder,

    visibleColumnKeys,
    setVisibleColumnKeys,

    showFullSQL,
    setShowFullSQL
  }
}
