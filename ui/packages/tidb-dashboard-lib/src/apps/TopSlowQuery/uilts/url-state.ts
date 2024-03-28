import useUrlState from '@ahooksjs/use-url-state'
import {
  TimeRange,
  toURLTimeRange,
  urlToTimeRange
} from '@lib/components/TimeRangeSelector'
import { useCallback, useMemo } from 'react'
import { DEFAULT_TIME_RANGE, DURATIONS, ORDER_BY } from './helpers'

// tw: time window (start-end)
type UrlState = Partial<
  Record<
    'from' | 'to' | 'duration' | 'tw' | 'order' | 'db' | 'internal',
    string
  >
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

  const duration: number = useMemo(() => {
    const v = parseInt(queryParams.duration)
    if (isNaN(v)) {
      return DURATIONS[0].value
    }
    if (DURATIONS.some((s) => s.value === v)) {
      return v
    }
    return DURATIONS[0].value
  }, [queryParams.duration])
  const setDuration = useCallback(
    (v: number) => {
      setQueryParams({ duration: v + '' })
    },
    [setQueryParams]
  )

  // Note: when calling `setDuration(); setTimeRange();` at the same time, only the last one will take effect
  // the latter one will overwrite the former one
  // TODO: do we have a better solution? expose the `setQueryParams` as well?
  const setDurationAndTimeRange = useCallback(
    (v: number, tr: TimeRange) => {
      setQueryParams({ duration: v + '', ...toURLTimeRange(tr) })
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

  const order = queryParams.order || ORDER_BY[0].value
  const setOrder = useCallback(
    (v: string) => setQueryParams({ order: v }),
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

    duration,
    setDuration,

    setDurationAndTimeRange,

    tw,
    setTw,

    order,
    setOrder,

    db,
    setDb,

    internal,
    setInternal
  }
}
