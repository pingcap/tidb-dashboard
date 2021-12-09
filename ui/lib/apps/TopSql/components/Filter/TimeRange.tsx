import React, { useState, useCallback, useMemo } from 'react'
import { Select } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { useURLQueryState } from '@lib/utils/useURLQueryState'

import './TimeRange.less'

interface TimeRangeProps {
  value: TimeRange
  onChange: (v: TimeRange) => void
}

export interface TimeRange {
  id: string
  // unit: second
  value: number
}

const timeRanges: TimeRange[] = [
  { id: '5m', value: 5 * 60 },
  { id: '1h', value: 60 * 60 },
  { id: '1d', value: 24 * 60 * 60 },
  { id: '1w', value: 7 * 24 * 60 * 60 },
]
const timeRangesMap: { [props: string]: TimeRange } = timeRanges.reduce(
  (prev, cur) => {
    return { ...prev, [cur.id]: cur }
  },
  {} as { [props: string]: TimeRange }
)
const defaultTimeRangeId = timeRanges[1].id

export function TimeRange({ value, onChange }: TimeRangeProps) {
  const handleChange = useCallback(
    (v: string) => onChange(timeRangesMap[v]),
    [onChange]
  )
  return (
    <Select onChange={handleChange} value={value.id} style={{ width: 150 }}>
      {timeRanges.map((tr) => (
        <Select.Option
          key={tr.id}
          value={tr.id}
          className="topsql-timerange-select-option"
        >
          <ClockCircleOutlined /> {getValueFormat('s')(tr.value, 0)}
        </Select.Option>
      ))}
    </Select>
  )
}

// refresh interval is related to TimeRange
// rules: https://docs.google.com/document/d/1pdSssZDTKJaPYKSFgDdskqdKNanekX_n-kmTBHHxpRM/edit
export const TIME_RANGE_INTERVAL_MAP: { [timeRangeId: string]: number } = {
  '5m': 5,
  '1h': 60,
  '1d': 5 * 60,
  '1w': 60 * 60,
}

export function useTimeRange() {
  const [timeRangeId, setTimeRangeId] = useURLQueryState(
    'time_range',
    defaultTimeRangeId
  )
  // save default time range when init
  const defaultTimeRange = useMemo(() => {
    return timeRanges.find((r) => r.id === timeRangeId) || timeRanges[0]
    // eslint-disable-next-line
  }, [])
  const [timeRange, _setTimeRange] = useState(defaultTimeRange)

  const setTimeRange = useCallback(
    (timeRange: TimeRange) => {
      _setTimeRange(timeRange)
      setTimeRangeId(timeRange.id)
    },
    [setTimeRangeId]
  )

  return {
    timeRange,
    setTimeRange,
    setInterval,
  }
}

export function getTimestampRange(timeRange: TimeRange): [number, number] {
  const now = parseInt(String(Date.now() / 1000))
  return [now - timeRange.value, now]
}
