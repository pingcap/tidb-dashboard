import useUrlState from '@ahooksjs/use-url-state'
import {
  TimeRange,
  toURLTimeRange,
  urlToTimeRange
} from '@lib/components/TimeRangeSelector'
import { useCallback, useMemo } from 'react'

type UrlState = Partial<Record<'from' | 'to', string>>

const DEFAULT_TIME_RANGE: TimeRange = { type: 'recent', value: 30 * 60 }

export function useResourceManagerUrlState() {
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

  return {
    timeRange,
    setTimeRange
  }
}
