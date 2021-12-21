import { useState } from 'react'

export const createUseTimeWindowSize = (barWidth: number) => {
  return () => {
    const [timeWindowSize, setTimeWindowSize] = useState<number>(1)
    const [isComputed, setIsComputed] = useState(false)
    // chart area px / time range = px per second = bar width / window size
    const computeTimeWindowSize = (
      screenWidth: number,
      totalTimeRange: number
    ) => {
      const widthPerSecond = screenWidth / totalTimeRange
      setTimeWindowSize(Math.ceil(barWidth / widthPerSecond))
      setIsComputed(true)
    }

    return {
      timeWindowSize,
      computeTimeWindowSize,
      isTimeWindowSizeComputed: isComputed,
    }
  }
}
