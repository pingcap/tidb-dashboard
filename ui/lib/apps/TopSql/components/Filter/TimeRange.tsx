import React, { useState, useCallback, useMemo } from 'react'
import { Radio } from 'antd'

import { useURLQueryState } from '@lib/utils/useURLQueryState'

interface TimeRangeProps {
  value: TimeRange
  onChange: (v: TimeRange) => void
}

export interface TimeRange {
  id: string
  label: string
  // unit: second
  value: number
}

const timeRanges: TimeRange[] = [
  { id: '5m', label: '5m', value: 5 * 60 },
  { id: '1h', label: '1h', value: 60 * 60 },
  { id: '1d', label: '1d', value: 24 * 60 * 60 },
  { id: '1w', label: '1w', value: 7 * 24 * 60 * 60 },
]
const defaultTimeRangeId = timeRanges[1].id

export function TimeRange({ value, onChange }: TimeRangeProps) {
  const handleRadioChange = useCallback((e) => onChange(e.target.value), [])
  return (
    <Radio.Group onChange={handleRadioChange} value={value}>
      {timeRanges.map((r) => (
        <Radio.Button value={r} key={r.value}>
          {r.label}
        </Radio.Button>
      ))}
    </Radio.Group>
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
  }, [])
  const [timeRange, _setTimeRange] = useState(defaultTimeRange)

  const setTimeRange = useCallback((timeRange: TimeRange) => {
    _setTimeRange(timeRange)
    setTimeRangeId(timeRange.id)
  }, [])

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
