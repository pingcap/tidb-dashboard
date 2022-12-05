import { TimeRange, toTimeRangeValue } from '@lib/components'
import { Skeleton } from 'antd'
import React, { useContext, useEffect, useRef, useState } from 'react'
import { SlowQueryContext } from '../../context'

interface AnalyzingProps {
  timeRange: TimeRange
  rows: number
  skipInit?: boolean
}

export const Analyzing: React.FC<AnalyzingProps> = ({
  timeRange,
  rows,
  skipInit = false,
  children
}) => {
  const { analyzing } = useAnalyzing(timeRange, skipInit)
  return <>{analyzing ? <Skeleton active paragraph={{ rows }} /> : children}</>
}

export const useAnalyzing = (timeRange: TimeRange, skipInit = false) => {
  const inited = useRef(false)
  const [analyzing, setAnalyzing] = useState(true)
  const ctx = useContext(SlowQueryContext)

  useEffect(() => {
    const analyze = async () => {
      const timeRangeValue = toTimeRangeValue(timeRange)
      setAnalyzing(true)
      await ctx?.ds.slowQueryAnalyze?.(timeRangeValue[0], timeRangeValue[1])
      setAnalyzing(false)
    }

    if (skipInit && !inited.current) {
      inited.current = true
      return
    }
    analyze()
  }, [timeRange])

  return { analyzing }
}
