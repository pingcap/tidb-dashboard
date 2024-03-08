import useUrlState from '@ahooksjs/use-url-state'
import {
  TimeRange,
  toURLTimeRange,
  urlToTimeRange
} from '@lib/components/TimeRangeSelector'
import { useCallback, useMemo } from 'react'
import { DEFAULT_TIME_RANGE, TIME_WINDOW_SIZES, TOP_N_TYPES } from './helpers'

// tws: time window size (1 hour, 2 hours ...)
// tw: time window (start-end)
type UrlState = Partial<
  Record<'from' | 'to' | 'tws' | 'tw' | 'top_type' | 'db' | 'internal', string>
>

export function useTopSlowQueryUrlState() {
  const [queryParams, setQueryParams] = useUrlState<UrlState>()

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

  const tws: number = useMemo(() => {
    const v = parseInt(queryParams.tws)
    if (isNaN(v)) {
      return TIME_WINDOW_SIZES[0].value
    }
    if (TIME_WINDOW_SIZES.some((s) => s.value === v)) {
      return v
    }
    return TIME_WINDOW_SIZES[0].value
  }, [queryParams.tws])
  const setTws = useCallback(
    (v: number) => {
      setQueryParams({ tws: v + '' })
    },
    [setQueryParams]
  )

  const tw = useMemo(() => {
    const arr = queryParams.tw?.split('-')
    if (arr && arr.length === 2) {
      const s = parseInt(arr[0])
      const e = parseInt(arr[1])
      if (!isNaN(s) && !isNaN(e)) {
        return [s, e]
      }
    }
    return [0, 0]
  }, [queryParams.tw])

  const setTw = useCallback(
    (v: string) => {
      // v format: "from-to"
      setQueryParams({ tw: v })
    },
    [setQueryParams]
  )

  const topType = queryParams.top_type || TOP_N_TYPES[0].value
  const setTopType = useCallback(
    (v: string) => setQueryParams({ top_type: v }),
    [setQueryParams]
  )

  const db = queryParams.db
  const setDb = useCallback(
    (v: string) => setQueryParams({ db: v }),
    [setQueryParams]
  )

  const internal = queryParams.internal || 'no'
  const setInternal = useCallback(
    (v: string) => setQueryParams({ internal: v }),
    [setQueryParams]
  )

  return {
    timeRange,
    setTimeRange,

    tws,
    setTws,

    tw,
    setTw,

    topType,
    setTopType,

    db,
    setDb,

    internal,
    setInternal
  }
}
