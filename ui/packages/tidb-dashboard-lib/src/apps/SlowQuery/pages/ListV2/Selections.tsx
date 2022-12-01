import React, { useState } from 'react'
import { Button, Select, Space, Tooltip } from 'antd'
import useUrlState from '@ahooksjs/use-url-state'
import { ExpandOutlined, FieldTimeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router'
import dayjs, { Dayjs } from 'dayjs'

import { TimeRangeSelector, Toolbar, TimeRange } from '@lib/components'
import styles from './List.module.less'
import { ExpandChart } from './ExpandChart'

export interface DisplayOptions {
  aggr_by?: 'query_time' | 'memory_max'
  group_by?: 'query' | 'user' | 'database' | 'use_tiflash'
  tiflash?: 'all' | 'yes' | 'no'
  time_range_type?: 'absolute' | 'relative'
  time_range?: string
}

interface SelectionsProps {
  selection: DisplayOptions
  onSelectionChange: (
    s: React.SetStateAction<Partial<{ [key in keyof DisplayOptions]: any }>>
  ) => void
  timeRange: TimeRange
  onTimeRangeChange: (val: TimeRange) => void
}

const RECENT_SECONDS = [10 * 60, 30 * 60, 60 * 60]

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
    value: 'use_tiflash',
    label: 'Use TiFlash'
  }
]

type RangeValue = [dayjs.Dayjs | null, dayjs.Dayjs | null] | null

export const Selections: React.FC<SelectionsProps> = ({
  selection,
  onSelectionChange,
  timeRange,
  onTimeRangeChange
}) => {
  const [openExpandChart, setOpenExpandChart] = useState(false)
  const navigate = useNavigate()
  const [dates, setDates] = useState<RangeValue>(null)

  const disabledDate = (current: dayjs.Dayjs) => {
    if (!dates) {
      return false
    }

    const inOneDay = dates[0] && dates[0].hour() < 23
    const inOneDayTooLate =
      dates[0] && inOneDay && current.diff(dates[0], 'day') > 0
    const tooLate = dates[0] && !inOneDay && current.diff(dates[0], 'day') === 1

    const inOneDay2 = dates[1] && dates[1].hour() > 0
    const inOneDay2TooEarly =
      dates[1] && inOneDay2 && dates[1].diff(current, 'day') > 0
    const tooEarly =
      dates[1] && !inOneDay2 && dates[1].diff(current, 'day') === 1

    return !!inOneDayTooLate || !!tooLate || !!inOneDay2TooEarly || !!tooEarly
  }

  const disabledTime = (_, type) => {
    if (type === 'start' && dates?.[1]) {
      const h = dates[1].hour()
      return {
        disabledHours: () => range(0, 60).filter((r) => r !== h - 1),
        disabledMinutes: () => [],
        disabledSeconds: () => []
      }
    }
    if (type === 'end' && dates?.[0]) {
      const h = dates[0].hour()
      return {
        disabledHours: () => range(0, 60).filter((r) => r !== h + 1),
        disabledMinutes: () => [],
        disabledSeconds: () => []
      }
    }
    return {
      disabledHours: () => [],
      disabledMinutes: () => [],
      disabledSeconds: () => []
    }
  }

  const onOpenChange = (open: boolean) => {
    if (open) {
      setDates([null, null])
    } else {
      setDates(null)
    }
  }

  return (
    <Toolbar className={styles.list_toolbar} data-e2e="slow_query_toolbar">
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
        <TimeRangeSelector
          recent_seconds={RECENT_SECONDS}
          value={timeRange}
          onChange={onTimeRangeChange}
          disabledDate={disabledDate}
          disabledTime={disabledTime}
          onCalendarChange={(val) => {
            console.log(val)
            setDates(val)
          }}
          onOpenChange={onOpenChange}
        />
      </Space>
      <Space>
        <>
          <Tooltip placement="bottom" title={'Time Comparison'}>
            <Button
              type="text"
              icon={<FieldTimeOutlined />}
              onClick={() => {
                const urlParams = new URLSearchParams(
                  selection as Record<string, string>
                )
                navigate(`comparison?${urlParams.toString()}`)
              }}
            />
          </Tooltip>
        </>

        <>
          <Tooltip placement="bottom" title={'Expand'}>
            <Button
              type="text"
              icon={<ExpandOutlined />}
              onClick={() => setOpenExpandChart(true)}
            />
          </Tooltip>
          <ExpandChart
            open={openExpandChart}
            onOpenChange={setOpenExpandChart}
          />
        </>
      </Space>
    </Toolbar>
  )
}

const DEFAULT_URL_QUERY_PARAMS: DisplayOptions = {
  aggr_by: 'query_time',
  group_by: 'query',
  tiflash: 'all'
}

export const useUrlSelection = () => {
  return useUrlState<DisplayOptions>(DEFAULT_URL_QUERY_PARAMS, {
    navigateMode: 'replace'
  })
}

const range = (start: number, end: number) => {
  const result: number[] = []
  for (let i = start; i < end; i++) {
    result.push(i)
  }
  return result
}
