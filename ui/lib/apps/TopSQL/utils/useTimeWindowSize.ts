import { TimeRangeValue } from '@lib/components'
import { useState } from 'react'

// Calculate time window size by total time range, bar width, screen width.
// window size * number of bar = time range
// bar width * number of bar = screen width
export const createUseTimeWindowSize = (barWidth: number) => {
  return () => {
    const [timeWindowSize, setTimeWindowSize] = useState<number>(0)
    const computeTimeWindowSize = (
      screenWidth: number,
      [min, max]: TimeRangeValue
    ) => {
      const windowSize = Math.ceil((barWidth * (max - min)) / screenWidth)
      setTimeWindowSize(windowSize)
      return windowSize
    }

    return {
      timeWindowSize,
      computeTimeWindowSize,
    }
  }
}
