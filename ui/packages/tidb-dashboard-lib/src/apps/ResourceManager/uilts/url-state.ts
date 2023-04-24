import useUrlState from '@ahooksjs/use-url-state'
import {
  TimeRange,
  toURLTimeRange,
  urlToTimeRange
} from '@lib/components/TimeRangeSelector'
import { useCallback, useMemo } from 'react'
import { DEFAULT_TIME_WINDOW, WORKLOAD_TYPES } from './helpers'

type UrlState = Partial<Record<'from' | 'to' | 'workload', string>>

export function useResourceManagerUrlState() {
  const [queryParams, setQueryParams] = useUrlState<UrlState>()

  const timeRange = useMemo(() => {
    const { from, to } = queryParams
    if (from && to) {
      return urlToTimeRange({ from, to })
    }
    return DEFAULT_TIME_WINDOW
  }, [queryParams.from, queryParams.to])

  const setTimeRange = useCallback(
    (newTimeRange: TimeRange) => {
      setQueryParams({ ...toURLTimeRange(newTimeRange) })
    },
    [setQueryParams]
  )

  const workload = queryParams.workload || WORKLOAD_TYPES[0]
  const setWorkload = useCallback(
    (w: string) => {
      setQueryParams({ workload: w || undefined })
    },
    [setQueryParams]
  )

  return {
    timeRange,
    setTimeRange,

    workload,
    setWorkload
  }
}
