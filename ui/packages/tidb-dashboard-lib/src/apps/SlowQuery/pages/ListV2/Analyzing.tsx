import { TimeRangeValue } from '@lib/components'
import { useChange } from '@lib/utils/useChange'
import { Skeleton } from 'antd'
import React, { useContext, useRef, useState } from 'react'
import { SlowQueryContext } from '../../context'

interface AnalyzingProps {
  timeRangeValue: TimeRangeValue
  rows: number
  skipInit?: boolean
}

export const Analyzing: React.FC<AnalyzingProps> = React.memo(
  ({ timeRangeValue, rows, skipInit = false, children }) => {
    const { analyzing } = useAnalyzing(timeRangeValue, skipInit)
    return (
      <>{analyzing ? <Skeleton active paragraph={{ rows }} /> : children}</>
    )
  }
)

export const useAnalyzing = (
  timeRangeValue: TimeRangeValue,
  skipInit = false
) => {
  const inited = useRef(false)
  const [analyzing, setAnalyzing] = useState(true)
  const ctx = useContext(SlowQueryContext)
  const prevTimeRange = useRef(timeRangeValue)
  const timeRangeNotEqual =
    prevTimeRange.current.toString() !== timeRangeValue.toString()

  useChange(() => {
    const analyze = async () => {
      setAnalyzing(true)
      await ctx?.ds.slowQueryAnalyze?.(timeRangeValue[0], timeRangeValue[1])
      prevTimeRange.current = timeRangeValue
      setAnalyzing(false)
    }

    if (skipInit && !inited.current) {
      inited.current = true
      return
    }
    analyze()
  }, [timeRangeValue[0], timeRangeValue[1]])

  return { analyzing: analyzing || timeRangeNotEqual }
}
