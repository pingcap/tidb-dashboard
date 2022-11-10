import {
  TimeSeriesChart,
  PromDataAccessor,
  PromQueryGroup,
  Trigger
} from '@diag-ui/chart'
import React, { MutableRefObject, useRef } from 'react'
import testData from './data.json'

export const SlowQueryChart = () => {
  const triggerRef: MutableRefObject<Trigger> = useRef<Trigger>(null as any)
  const refreshChart = () => {
    triggerRef.current({ start_time: 1666100460, end_time: 1666100910 })
  }

  return (
    <PromDataAccessor
      fetch={(query, tp) => Promise.resolve(testData as any)}
      setTrigger={(trigger) => {
        triggerRef.current = trigger
        refreshChart()
      }}
    >
      <TimeSeriesChart modifyOption={(opt) => ({ ...opt })}>
        <PromQueryGroup
          queries={[
            {
              promql: 'test',
              name: '{sql_type}',
              color: 'test',
              type: 'scatter'
            }
          ]}
          unit="s"
        />
      </TimeSeriesChart>
    </PromDataAccessor>
  )
}
