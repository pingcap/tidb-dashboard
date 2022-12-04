import React from 'react'
import { Select, Space } from 'antd'

import { TimeRange, Toolbar } from '@lib/components'
import { AGGR_BY, GROUP_BY } from '../Selections'
import { DisplayOptions } from '../../../components/charts/ScatterChart'
import { LimitTimeRange } from '@lib/apps/SlowQuery/components/LimitTimeRange'

interface SelectionsProps {
  selection: DisplayOptions
  onSelectionChange: (
    s: React.SetStateAction<Partial<{ [key in keyof DisplayOptions]: any }>>
  ) => void
  timeRange: TimeRange
  onTimeRangeChange: (val: TimeRange) => void
}

export const Selections: React.FC<SelectionsProps> = ({
  selection,
  onSelectionChange,
  timeRange,
  onTimeRangeChange
}) => {
  return (
    <Toolbar>
      <Space>
        <div>
          <span style={{ marginRight: '6px' }}>Aggregate By:</span>
          <Select
            defaultValue={selection.aggrBy}
            style={{ width: 150 }}
            options={AGGR_BY}
            onChange={(v) => onSelectionChange({ aggrBy: v })}
          />
        </div>
        <div>
          <span style={{ marginRight: '6px' }}>Group By:</span>
          <Select
            defaultValue={selection.groupBy}
            style={{ width: 150 }}
            options={GROUP_BY}
            onChange={(v) => onSelectionChange({ groupBy: v })}
          />
        </div>
        <div>
          <span style={{ marginRight: '6px' }}>Use TiFlash:</span>
          <Select
            defaultValue={selection.tiflash}
            style={{ width: 150 }}
            options={[
              {
                value: 'all',
                label: 'All'
              },
              {
                value: 'yes',
                label: 'Yes'
              },
              {
                value: 'no',
                label: 'No'
              }
            ]}
            onChange={(v) => onSelectionChange({ tiflash: v })}
          />
        </div>
        <LimitTimeRange value={timeRange} onChange={onTimeRangeChange} />
      </Space>
    </Toolbar>
  )
}
