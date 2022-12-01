import React, { useState } from 'react'
import { Button, Select, Space, Tooltip } from 'antd'
import useUrlState from '@ahooksjs/use-url-state'

import { TimeRangeSelector, Toolbar, TimeRange } from '@lib/components'
import styles from './Comparison.module.less'
import { ExpandOutlined, FieldTimeOutlined } from '@ant-design/icons'

interface SelectionsProps {
  selection: UrlQueryParams
  onSelectionChange: (
    s: React.SetStateAction<Partial<{ [key in keyof UrlQueryParams]: any }>>
  ) => void
}

const AGGR_BY = [
  {
    value: 'query_time',
    label: 'Latency'
  },
  {
    value: 'memory_max',
    label: 'Memory'
  }
]

const GROUP_BY = [
  {
    value: 'query',
    label: 'SQL Text'
  },
  {
    value: 'user',
    label: 'User'
  },
  {
    value: 'database',
    label: 'Database'
  },
  {
    value: 'tiflash',
    label: 'Use TiFlash'
  }
]

export const Selections: React.FC<SelectionsProps> = ({
  selection,
  onSelectionChange
}) => {
  return (
    <Toolbar className={styles.compar_toolbar}>
      <Space>
        <div>
          <span style={{ marginRight: '6px' }}>Aggregate By:</span>
          <Select
            defaultValue={selection.aggr_by}
            style={{ width: 150 }}
            options={AGGR_BY}
            onChange={(v) => onSelectionChange({ aggr_by: v })}
          />
        </div>
        <div>
          <span style={{ marginRight: '6px' }}>Group By:</span>
          <Select
            defaultValue={selection.group_by}
            style={{ width: 150 }}
            options={GROUP_BY}
            onChange={(v) => onSelectionChange({ group_by: v })}
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
      </Space>
    </Toolbar>
  )
}

interface UrlQueryParams {
  aggr_by?: 'query_time' | 'memory_max'
  group_by?: 'query' | 'user' | 'database' | 'tiflash'
  tiflash?: 'all' | 'yes' | 'no'
  time_range?: string
}

const DEFAULT_URL_QUERY_PARAMS: UrlQueryParams = {
  aggr_by: 'query_time',
  group_by: 'query',
  tiflash: 'all'
}

export const useUrlSelection = () => {
  return useUrlState<UrlQueryParams>(DEFAULT_URL_QUERY_PARAMS)
}
