import { useState } from 'react'

// Calculate time window size by total time range, bar width, screen width.
// window size * number of bar = time range
// bar width * number of bar = screen width
export const createUseTimeWindowSize = (barWidth: number) => {
  return () => {
    const [timeWindowSize, setTimeWindowSize] = useState<number>(0)
    const [isComputed, setIsComputed] = useState(false)
    const computeTimeWindowSize = (
      screenWidth: number,
      totalTimeRange: number
    ) => {
      const windowSize = (barWidth * totalTimeRange) / screenWidth
      setTimeWindowSize(Math.ceil(windowSize))
      setIsComputed(true)
    }

    return {
      timeWindowSize,
      computeTimeWindowSize,
      isTimeWindowSizeComputed: isComputed,
    }
  }
}
