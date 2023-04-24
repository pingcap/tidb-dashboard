import { Card, TimeRangeSelector } from '@lib/components'
import React from 'react'
import { useResourceManagerUrlState } from '../uilts/url-state'

export const Metrics: React.FC = () => {
  const { timeRange, setTimeRange } = useResourceManagerUrlState()

  return (
    <Card title="Metrics">
      <div>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>
    </Card>
  )
}
