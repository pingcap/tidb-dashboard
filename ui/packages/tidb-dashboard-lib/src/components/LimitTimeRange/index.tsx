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
  // time range limit in seconds
  timeRangeLimit?: number
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
  disabled,
  timeRangeLimit
}) => {
  // get the selectable time range value from rencent_seconds
  const selectableHours = useMemo(() => {
    return recent_seconds![recent_seconds!.length - 1] / 3600
  }, [recent_seconds])

  // Use timeRangeLimit if provided, otherwise use selectableHours
  const timeRangeHours = useMemo(() => {
    if (timeRangeLimit !== undefined) {
      return timeRangeLimit / 3600 // Convert seconds to hours
    }
    return selectableHours
  }, [timeRangeLimit, selectableHours])

  const disabledDate = (current) => {
    const today = dayjs()
    const todayStartWithHour = today.startOf('hour')
    const todayStartWithDay = today.startOf('day')
    const todayEndWithDay = today.endOf('day')

    const curDate = dayjs(current)

    // Can not select days before the earliest allowed date
    const tooEarly =
      todayStartWithHour.subtract(timeRangeHours, 'hour') >
        curDate.startOf('hour') &&
      todayStartWithDay.subtract(timeRangeHours / 24, 'day') >
        curDate.startOf('day')

    // Can not select days after today
    const tooLate =
      todayStartWithHour < curDate.startOf('hour') &&
      todayEndWithDay < curDate.endOf('day')

    return current && (tooEarly || tooLate)
  }

  // control avaliable time on Minute level
  const disabledTime = (current, type) => {
    // current hour
    const today = dayjs()
    const hour = today.hour()
    const minute = today.minute()

    // Only apply time restrictions for today
    // For historical dates, allow all times
    if (current && current.isSame(today, 'day')) {
      const curHour = dayjs(current).hour()
      return {
        disabledHours: () => hoursRange.slice(hour + 1),
        disabledMinutes: () =>
          // if current hour, disable minutes after current minute
          curHour === hour ? minutesRange.slice(minute + 1) : []
      }
    }

    // For the earliest selectable date, restrict times before current time
    const earliestDate = today.subtract(timeRangeHours / 24, 'day')
    if (current && current.isSame(earliestDate, 'day')) {
      const curHour = dayjs(current).hour()
      return {
        disabledHours: () => hoursRange.slice(0, hour),
        disabledMinutes: () =>
          // if current hour, disable minutes before current minute
          curHour === hour ? minutesRange.slice(0, minute) : []
      }
    }

    // For all other historical dates, allow all times
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
          selectableHours={selectableHours}
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
