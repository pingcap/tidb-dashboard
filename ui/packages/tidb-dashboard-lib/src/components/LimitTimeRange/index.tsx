import { TimeRange, TimeRangeSelector } from '@lib/components'
import dayjs from 'dayjs'
import React, { useMemo } from 'react'

interface LimitTimeRangeProps {
  value: TimeRange
  recent_seconds?: number[]
  customAbsoluteRangePicker?: boolean
  onChange: (val: TimeRange) => void
  onZoomOutClick: (start: number, end: number) => void
  disabled?: boolean
}

// array of 24 numbers, start from 0
const hoursRange = [...Array(24).keys()]
const minutesRange = [...Array(60).keys()]

// These presets are aligned with Grafana
const DEFAULT_RECENT_SECONDS = [
  5 * 60,
  15 * 60,
  30 * 60,
  60 * 60,
  3 * 60 * 60,
  6 * 60 * 60,
  12 * 60 * 60,
  24 * 60 * 60,
  2 * 24 * 60 * 60,
  7 * 24 * 60 * 60,
  30 * 24 * 60 * 60,
  90 * 24 * 60 * 60
]

export const LimitTimeRange: React.FC<LimitTimeRangeProps> = ({
  value,
  recent_seconds = DEFAULT_RECENT_SECONDS,
  customAbsoluteRangePicker,
  onChange,
  onZoomOutClick,
  disabled
}) => {
  // get the selectable time range value from rencent_seconds
  const selectableHours = useMemo(() => {
    return recent_seconds![recent_seconds!.length - 1] / 3600
  }, [recent_seconds])

  const disabledDate = (current) => {
    const today = dayjs()
    const todayStartWithHour = today.startOf('hour')
    const todayStartWithDay = today.startOf('day')
    const todayEndWithDay = today.endOf('day')

    const curDate = dayjs(current)

    // Can not select days before 2 days ago
    const tooEarly =
      todayStartWithHour.subtract(selectableHours, 'hour') >
        curDate.startOf('hour') &&
      todayStartWithDay.subtract(selectableHours / 24, 'day') >
        curDate.startOf('day')

    // Can not select days after today
    const tooLate =
      todayStartWithHour < curDate.startOf('hour') &&
      todayEndWithDay < curDate.endOf('day')

    return current && (tooEarly || tooLate)
  }

  // control avaliable time on Minute level
  const disabledTime = (current) => {
    // current hour
    const today = dayjs()
    const hour = today.hour()
    const minute = today.minute()

    const curHour = dayjs(current).hour()
    // is current day
    if (current && current.isSame(today, 'day')) {
      return {
        disabledHours: () => hoursRange.slice(hour + 1),
        disabledMinutes: () =>
          // if current hour, disable minutes before current minute
          curHour === hour ? minutesRange.slice(minute + 1) : []
      }
    }

    // is 2 day ago
    if (
      current &&
      current.isSame(today.subtract(selectableHours / 24, 'day'), 'day')
    ) {
      return {
        disabledHours: () => hoursRange.slice(0, hour),
        disabledMinutes: () =>
          // if current hour, disable minutes after current minute
          curHour === hour ? minutesRange.slice(0, minute) : []
      }
    }

    return { disabledHours: () => [] }
  }

  return (
    <>
      {customAbsoluteRangePicker ? (
        <TimeRangeSelector
          value={value}
          onChange={onChange}
          recent_seconds={recent_seconds}
          disabledDate={disabledDate}
          disabledTime={disabledTime}
          customAbsoluteRangePicker={true}
          disabled={disabled}
        />
      ) : (
        <TimeRangeSelector.WithZoomOut
          value={value}
          onChange={onChange}
          recent_seconds={recent_seconds}
          onZoomOutClick={onZoomOutClick}
          disabled={disabled}
        />
      )}
    </>
  )
}
