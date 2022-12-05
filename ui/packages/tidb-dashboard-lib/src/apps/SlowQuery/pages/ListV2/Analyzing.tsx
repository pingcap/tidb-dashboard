import { TimeRange, toTimeRangeValue } from '@lib/components'
import { useChange } from '@lib/utils/useChange'
import { Skeleton } from 'antd'
import React, { useContext, useEffect, useRef, useState } from 'react'
import { SlowQueryContext } from '../../context'

interface AnalyzingProps {
  timeRange: TimeRange
  rows: number
  skipInit?: boolean
}

export const Analyzing: React.FC<AnalyzingProps> = React.memo(
  ({ timeRange, rows, skipInit = false, children }) => {
    const { analyzing } = useAnalyzing(timeRange, skipInit)
    return (
      <>{analyzing ? <Skeleton active paragraph={{ rows }} /> : children}</>
    )
  }
)

export const useAnalyzing = (timeRange: TimeRange, skipInit = false) => {
  const inited = useRef(false)
  const [analyzing, setAnalyzing] = useState(true)
  const ctx = useContext(SlowQueryContext)
  const timeRangeValue = toTimeRangeValue(timeRange)

  useChange(() => {
    const analyze = async () => {
      setAnalyzing(true)
      await ctx?.ds.slowQueryAnalyze?.(timeRangeValue[0], timeRangeValue[1])
      setAnalyzing(false)
    }

    if (skipInit && !inited.current) {
      inited.current = true
      return
    }
    analyze()
  }, [timeRangeValue.toString()])

  return { analyzing }
}
