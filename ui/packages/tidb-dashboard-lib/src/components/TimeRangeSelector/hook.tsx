import { useCallback, useMemo } from 'react'
import {
  toTimeRangeValue,
  fromTimeRangeValue,
  TimeRange,
  TimeRangeValue
} from '.'

export function useTimeRangeValue(
  timeRange: TimeRange,
  setTimeRange: (TimeRange) => void
): [TimeRangeValue, (r: TimeRangeValue) => void] {
  const value = useMemo(() => toTimeRangeValue(timeRange), [timeRange])
  const setValue = useCallback(
    (r: TimeRangeValue) => {
      setTimeRange(fromTimeRangeValue(r))
    },
    [setTimeRange]
  )
  return [value, setValue]
}
