import { TimeRange, TimeRangeSelector } from '@lib/components'
import dayjs from 'dayjs'
import React, { useState } from 'react'

interface LimitTimeRangeProps {
  value: TimeRange
  onChange: (val: TimeRange) => void
}

type RangeValue = [dayjs.Dayjs | null, dayjs.Dayjs | null] | null

const RECENT_SECONDS = [10 * 60, 30 * 60, 60 * 60]

export const LimitTimeRange: React.FC<LimitTimeRangeProps> = ({
  value,
  onChange
}) => {
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
    <TimeRangeSelector
      recent_seconds={RECENT_SECONDS}
      value={value}
      onChange={onChange}
      disabledDate={disabledDate}
      disabledTime={disabledTime}
      onCalendarChange={(val) => setDates(val)}
      onOpenChange={onOpenChange}
    />
  )
}

const range = (start: number, end: number) => {
  const result: number[] = []
  for (let i = start; i < end; i++) {
    result.push(i)
  }
  return result
}
