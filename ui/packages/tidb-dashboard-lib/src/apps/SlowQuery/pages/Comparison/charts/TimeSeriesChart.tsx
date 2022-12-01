import React, { MutableRefObject, useEffect, useRef } from 'react'

import { TimeRange } from '@lib/components'
import { PromDataAccessor } from '@diag-ui/chart'
import { TimeSeriesChart as DiagTimeSeriesChart } from '@diag-ui/chart'
import { PromQueryGroup } from '@diag-ui/chart'
import { Chart } from '@diag-ui/chart'
import { Trigger } from '@diag-ui/chart'

interface LineChartProps {
  height: number
  timeRange: TimeRange
  type: 'line' | 'scatter'
}

export const TimeSeriesChart: React.FC<LineChartProps> = ({
  height,
  timeRange,
  type
}) => {
  const triggerRef = useRef<Trigger>(null as any)
  const refreshChart = () => {
    triggerRef.current({ start_time: 1668936700, end_time: 1668938500 })
  }
  const chartRef = useRef<Chart>(null)

  useEffect(() => {
    refreshChart()
  }, [])

  return (
    <PromDataAccessor
      ref={triggerRef}
      fetch={(query, tp) => {
        return fetch(
          'http://127.0.0.1:8428/api/v1/query_range?query=query_time&start=1668938500&end=1668968500&step=1m'
        ).then((resp) => resp.json())
      }}
    >
      <DiagTimeSeriesChart
        height={height}
        ref={chartRef}
        modifyConfig={(cfg) => ({ ...cfg })}
      >
        <PromQueryGroup
          queries={[
            {
              promql: 'test',
              name: '{query}',
              type
            }
          ]}
          unit="s"
        />
      </DiagTimeSeriesChart>
    </PromDataAccessor>
  )
}
