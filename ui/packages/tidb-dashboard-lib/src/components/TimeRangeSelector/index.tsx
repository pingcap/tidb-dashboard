import React, { useState, useMemo, useEffect } from 'react'
import { Dropdown, Button, TimePicker } from 'antd'
import { ClockCircleOutlined, DownOutlined } from '@ant-design/icons'
import {
  getValueFormat,
  toFixedScaled,
  toFixed,
  DecimalCount
} from '@baurine/grafana-value-formats'
import cx from 'classnames'
import dayjs, { Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'
import { RangePickerProps } from 'antd/es/date-picker/generatePicker'

import styles from './index.module.less'
import { useChange } from '@lib/utils/useChange'
import { useMemoizedFn } from 'ahooks'
import { WithZoomOut } from './WithZoomOut'
import { tz } from '@lib/utils'
import { PickerComponentClass } from 'antd/lib/date-picker/generatePicker/interface'
import DatePicker from '@lib/components/DatePicker'
// import TimePicker from '@lib/components/TimePicker'

const { RangePicker: RangePickerAntd } = DatePicker
const RangePicker: PickerComponentClass<
  RangePickerProps<Dayjs>,
  unknown
> = RangePickerAntd as any

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

export const DEFAULT_TIME_RANGE: TimeRange = {
  type: 'recent',
  value: 30 * 60
}

export interface RelativeTimeRange {
  type: 'recent'
  value: number // unit: seconds
}

export interface AbsoluteTimeRange {
  type: 'absolute'
  value: TimeRangeValue // unit: seconds
}

export type TimeRangeValue = [minSecond: number, maxSecond: number]

export type TimeRange = RelativeTimeRange | AbsoluteTimeRange

export function toTimeRangeValue(
  timeRange?: TimeRange,
  offset = 0
): TimeRangeValue {
  let t2 = timeRange ?? DEFAULT_TIME_RANGE
  if (t2.type === 'absolute') {
    return t2.value.map((t) => t + offset) as TimeRangeValue
  } else {
    const now = dayjs().unix()
    return [now - t2.value + offset, now + 1 + offset]
  }
}

export function fromTimeRangeValue(v: TimeRangeValue): AbsoluteTimeRange {
  return {
    type: 'absolute',
    value: [...v]
  }
}

//////////////////////

export type URLTimeRange = { from: string; to: string }

export const toURLTimeRange = (timeRange: TimeRange): URLTimeRange => {
  if (timeRange.type === 'recent') {
    return { from: `${timeRange.value}`, to: 'now' }
  }

  const timeRangeValue = toTimeRangeValue(timeRange)
  return { from: `${timeRangeValue[0]}`, to: `${timeRangeValue[1]}` }
}

export const urlToTimeRange = (urlTimeRange: URLTimeRange): TimeRange => {
  if (urlTimeRange.to === 'now') {
    return { type: 'recent', value: Number(urlTimeRange.from) }
  }
  return {
    type: 'absolute',
    value: [Number(urlTimeRange.from), Number(urlTimeRange.to)]
  }
}

export const urlToTimeRangeValue = (
  urlTimeRange: URLTimeRange
): TimeRangeValue => {
  return toTimeRangeValue(urlToTimeRange(urlTimeRange))
}

//////////////////////

/**
 * @deprecated
 */
// TODO: Compatibility alias. To be removed.
export function calcTimeRange(timeRange?: TimeRange): TimeRangeValue {
  return toTimeRangeValue(timeRange)
}

/**
 * @deprecated
 */
// TODO: JSON.stringify() is enough. To be removed.
export function stringifyTimeRange(timeRange?: TimeRange): string {
  let t2 = timeRange ?? DEFAULT_TIME_RANGE
  if (t2.type === 'absolute') {
    return `${t2.type}_${t2.value[0]}_${t2.value[1]}`
  } else {
    return `${t2.type}_${t2.value}`
  }
}

export interface ITimeRangeSelectorProps {
  value?: TimeRange
  onChange?: (val: TimeRange) => void
  disabled?: boolean
  recent_seconds?: number[]
  disabledDate?: RangePickerProps<dayjs.Dayjs>['disabledDate']
  disabledTime?: RangePickerProps<dayjs.Dayjs>['disabledTime']
  onCalendarChange?: RangePickerProps<dayjs.Dayjs>['onCalendarChange']
  onOpenChange?: RangePickerProps<dayjs.Dayjs>['onOpenChange']
  customAbsoluteRangePicker?: boolean
  selectableHours?: number
}

const trySubstract = (value1, value2) => {
  if (
    value1 !== null &&
    value1 !== undefined &&
    value2 !== null &&
    value2 !== undefined
  ) {
    return value1 - value2
  }
  return undefined
}

const customValueFormat = (
  size: number,
  decimals?: DecimalCount,
  scaledDecimals?: DecimalCount
) => {
  if (size === null) {
    return ''
  }
  // Less than 1 µs, divide in ns
  if (Math.abs(size) < 0.000001) {
    return toFixedScaled(
      size * 1e9,
      decimals,
      trySubstract(scaledDecimals, decimals),
      -9,
      ' ns'
    )
  }
  // Less than 1 ms, divide in µs
  if (Math.abs(size) < 0.001) {
    return toFixedScaled(
      size * 1e6,
      decimals,
      trySubstract(scaledDecimals, decimals),
      -6,
      ' µs'
    )
  }
  // Less than 1 second, divide in ms
  if (Math.abs(size) < 1) {
    return toFixedScaled(
      size * 1e3,
      decimals,
      trySubstract(scaledDecimals, decimals),
      -3,
      ' ms'
    )
  }

  if (Math.abs(size) < 60) {
    return toFixed(size, decimals) + ' s'
  } else if (Math.abs(size) < 3600) {
    // Less than 1 hour, divide in minutes
    return toFixedScaled(size / 60, decimals, scaledDecimals, 1, ' min')
  } else if (Math.abs(size) < 86400) {
    // Less than one day, divide in hours
    return toFixedScaled(size / 3600, decimals, scaledDecimals, 4, ' hour')
  } else {
    // Less than one week, divide in days
    return toFixedScaled(size / 86400, decimals, scaledDecimals, 5, ' day')
  }
}

function TimeRangeSelector({
  value,
  onChange,
  disabled = false,
  recent_seconds = DEFAULT_RECENT_SECONDS,
  disabledDate,
  disabledTime,
  onCalendarChange,
  onOpenChange,
  customAbsoluteRangePicker = false,
  selectableHours
}: ITimeRangeSelectorProps) {
  const { t } = useTranslation()
  const [dropdownVisible, setDropdownVisible] = useState(false)
  const [rangeError, setRangeError] = useState<string | null>(null)

  useChange(() => {
    if (!value) {
      onChange?.(DEFAULT_TIME_RANGE)
    }
  }, [value])

  const rangePickerValue = useMemo(() => {
    if (value?.type !== 'absolute') {
      return null
    }
    return value.value.map((sec) => dayjs(sec * 1000)) as [Dayjs, Dayjs]
  }, [value])

  // Combined state for From and To date/time pickers
  const [fromDateTime, setFromDateTime] = useState<Dayjs | null>(null)
  const [toDateTime, setToDateTime] = useState<Dayjs | null>(null)

  // Initialize from/to values when value changes
  useEffect(() => {
    if (value?.type === 'absolute' && rangePickerValue) {
      const [from, to] = rangePickerValue
      setFromDateTime(from)
      setToDateTime(to)
    } else {
      setFromDateTime(null)
      setToDateTime(null)
    }
  }, [value, rangePickerValue])

  // Trigger onCalendarChange whenever fromDateTime or toDateTime changes
  useEffect(() => {
    if (onCalendarChange) {
      const rangeValue: [Dayjs | null, Dayjs | null] | null =
        fromDateTime !== null || toDateTime !== null
          ? [fromDateTime, toDateTime]
          : null
      onCalendarChange(
        rangeValue,
        [
          fromDateTime?.format('YYYY-MM-DD HH:mm:ss') || '',
          toDateTime?.format('YYYY-MM-DD HH:mm:ss') || ''
        ],
        {} as any
      )
    }
  }, [fromDateTime, toDateTime, onCalendarChange])

  // Validate time range: check from > to, selectableHours, disabledDate, and disabledTime
  useEffect(() => {
    if (fromDateTime && toDateTime) {
      // First check: from cannot be greater than to
      if (fromDateTime.isAfter(toDateTime)) {
        setRangeError('From time cannot be greater than To time.')
        return
      }

      // Second check: time range cannot exceed selectableHours
      if (selectableHours) {
        const diffInHours = toDateTime.diff(fromDateTime, 'hour')
        if (diffInHours > selectableHours) {
          setRangeError(
            `Time range cannot exceed ${selectableHours} hours. Current range: ${diffInHours.toFixed(
              2
            )} hours.`
          )
          return
        }
      }

      // Third check: validate disabledDate for fromDateTime
      if (disabledDate && disabledDate(fromDateTime)) {
        setRangeError('Selected start date is not allowed.')
        return
      }

      // Fourth check: validate disabledDate for toDateTime
      if (disabledDate && disabledDate(toDateTime)) {
        setRangeError('Selected end date is not allowed.')
        return
      }

      // Fifth check: validate disabledTime for fromDateTime
      if (disabledTime) {
        const disabledTimeResult = disabledTime(fromDateTime, 'start')
        if (disabledTimeResult) {
          const fromHour = fromDateTime.hour()
          const fromMinute = fromDateTime.minute()
          const fromSecond = fromDateTime.second()

          const disabledHours = disabledTimeResult.disabledHours?.() || []
          const disabledMinutes =
            disabledTimeResult.disabledMinutes?.(fromHour) || []
          const disabledSeconds =
            disabledTimeResult.disabledSeconds?.(fromHour, fromMinute) || []

          if (
            disabledHours.includes(fromHour) ||
            disabledMinutes.includes(fromMinute) ||
            disabledSeconds.includes(fromSecond)
          ) {
            setRangeError('Selected start time is not allowed.')
            return
          }
        }
      }

      // Sixth check: validate disabledTime for toDateTime
      if (disabledTime) {
        const disabledTimeResult = disabledTime(toDateTime, 'end')
        if (disabledTimeResult) {
          const toHour = toDateTime.hour()
          const toMinute = toDateTime.minute()
          const toSecond = toDateTime.second()

          const disabledHours = disabledTimeResult.disabledHours?.() || []
          const disabledMinutes =
            disabledTimeResult.disabledMinutes?.(toHour) || []
          const disabledSeconds =
            disabledTimeResult.disabledSeconds?.(toHour, toMinute) || []

          if (
            disabledHours.includes(toHour) ||
            disabledMinutes.includes(toMinute) ||
            disabledSeconds.includes(toSecond)
          ) {
            setRangeError('Selected end time is not allowed.')
            return
          }
        }
      }

      // No errors
      setRangeError(null)
    } else {
      setRangeError(null)
    }
  }, [fromDateTime, toDateTime, selectableHours, disabledDate, disabledTime])

  // Handle fromDate change: update fromDateTime with new date, keeping time
  const handleFromDateChange = useMemoizedFn((date: Dayjs | null) => {
    if (date && fromDateTime) {
      // Keep the time part from fromDateTime, but apply it to the new date
      const newFromDateTime = date
        .hour(fromDateTime.hour())
        .minute(fromDateTime.minute())
        .second(fromDateTime.second())
        .millisecond(fromDateTime.millisecond())
      setFromDateTime(newFromDateTime)

      // If toDateTime exists, check if we need to adjust
      if (toDateTime && newFromDateTime.isAfter(toDateTime)) {
        // Set toDateTime to be slightly after fromDateTime
        setToDateTime(newFromDateTime.add(1, 'second'))
      }
    } else if (date) {
      // If date is set but no fromDateTime, set default time (00:00:00)
      setFromDateTime(date.startOf('day'))
    } else {
      // If date is cleared, clear fromDateTime
      setFromDateTime(null)
    }
  })

  // Handle fromTime change: update fromDateTime with new time, keeping date
  const handleFromTimeChange = useMemoizedFn((time: Dayjs | null) => {
    if (time && fromDateTime) {
      // Keep the date part from fromDateTime, but apply new time
      const newFromDateTime = fromDateTime
        .hour(time.hour())
        .minute(time.minute())
        .second(time.second())
        .millisecond(time.millisecond())
      setFromDateTime(newFromDateTime)

      // If toDateTime exists, check if we need to adjust
      if (toDateTime && newFromDateTime.isAfter(toDateTime)) {
        // Set toDateTime to be slightly after fromDateTime
        setToDateTime(newFromDateTime.add(1, 'second'))
      }
    } else if (time) {
      // If time is set but no fromDateTime, use today's date
      const today = dayjs().startOf('day')
      setFromDateTime(
        today
          .hour(time.hour())
          .minute(time.minute())
          .second(time.second())
          .millisecond(time.millisecond())
      )
    } else {
      // If time is cleared, clear fromDateTime
      setFromDateTime(null)
    }
  })

  // Handle toDate change: update toDateTime with new date, keeping time
  const handleToDateChange = useMemoizedFn((date: Dayjs | null) => {
    if (date && toDateTime) {
      // Keep the time part from toDateTime, but apply it to the new date
      const newToDateTime = date
        .hour(toDateTime.hour())
        .minute(toDateTime.minute())
        .second(toDateTime.second())
        .millisecond(toDateTime.millisecond())
      setToDateTime(newToDateTime)

      // If fromDateTime exists, check if we need to adjust
      if (fromDateTime && fromDateTime.isAfter(newToDateTime)) {
        // Set fromDateTime to be slightly before toDateTime
        setFromDateTime(newToDateTime.subtract(1, 'second'))
      }
    } else if (date) {
      // If date is set but no toDateTime, set default time (23:59:59)
      setToDateTime(date.startOf('day'))
    } else {
      // If date is cleared, clear toDateTime
      setToDateTime(null)
    }
  })

  // Handle toTime change: update toDateTime with new time, keeping date
  const handleToTimeChange = useMemoizedFn((time: Dayjs | null) => {
    if (time && toDateTime) {
      // Keep the date part from toDateTime, but apply new time
      const newToDateTime = toDateTime
        .hour(time.hour())
        .minute(time.minute())
        .second(time.second())
        .millisecond(time.millisecond())
      setToDateTime(newToDateTime)

      // If fromDateTime exists, check if we need to adjust
      if (fromDateTime && fromDateTime.isAfter(newToDateTime)) {
        // Set fromDateTime to be slightly before toDateTime
        setFromDateTime(newToDateTime.subtract(1, 'second'))
      }
    } else if (time) {
      // If time is set but no toDateTime, use today's date
      const today = dayjs().startOf('day')
      setToDateTime(
        today
          .hour(time.hour())
          .minute(time.minute())
          .second(time.second())
          .millisecond(time.millisecond())
      )
    } else {
      // If time is cleared, clear toDateTime
      setToDateTime(null)
    }
  })

  const handleRecentChange = useMemoizedFn((seconds: number) => {
    onChange?.({
      type: 'recent',
      value: seconds
    })
    setDropdownVisible(false)
  })

  const handleOk = useMemoizedFn(() => {
    if (fromDateTime && toDateTime) {
      // Validate: from cannot be greater than to
      if (fromDateTime.isAfter(toDateTime)) {
        // If from > to, prevent the change
        return
      }

      // Validate: time range cannot exceed selectableHours
      if (selectableHours) {
        const diffInHours = toDateTime.diff(fromDateTime, 'hour', true)
        if (diffInHours > selectableHours) {
          // Prevent submission if range exceeds selectableHours
          return
        }
      }

      // Validate: disabledDate for fromDateTime
      if (disabledDate && disabledDate(fromDateTime)) {
        return
      }

      // Validate: disabledDate for toDateTime
      if (disabledDate && disabledDate(toDateTime)) {
        return
      }

      // Validate: disabledTime for fromDateTime
      if (disabledTime) {
        const disabledTimeResult = disabledTime(fromDateTime, 'start')
        if (disabledTimeResult) {
          const fromHour = fromDateTime.hour()
          const fromMinute = fromDateTime.minute()
          const fromSecond = fromDateTime.second()

          const disabledHours = disabledTimeResult.disabledHours?.() || []
          const disabledMinutes =
            disabledTimeResult.disabledMinutes?.(fromHour) || []
          const disabledSeconds =
            disabledTimeResult.disabledSeconds?.(fromHour, fromMinute) || []

          if (
            disabledHours.includes(fromHour) ||
            disabledMinutes.includes(fromMinute) ||
            disabledSeconds.includes(fromSecond)
          ) {
            return
          }
        }
      }

      // Validate: disabledTime for toDateTime
      if (disabledTime) {
        const disabledTimeResult = disabledTime(toDateTime, 'end')
        if (disabledTimeResult) {
          const toHour = toDateTime.hour()
          const toMinute = toDateTime.minute()
          const toSecond = toDateTime.second()

          const disabledHours = disabledTimeResult.disabledHours?.() || []
          const disabledMinutes =
            disabledTimeResult.disabledMinutes?.(toHour) || []
          const disabledSeconds =
            disabledTimeResult.disabledSeconds?.(toHour, toMinute) || []

          if (
            disabledHours.includes(toHour) ||
            disabledMinutes.includes(toMinute) ||
            disabledSeconds.includes(toSecond)
          ) {
            return
          }
        }
      }

      onChange?.({
        type: 'absolute',
        value: [fromDateTime.unix(), toDateTime.unix()]
      })
      setDropdownVisible(false)
      onOpenChange?.(false)
    }
  })

  // Pass through external disabledDate to DatePicker (no additional restrictions)
  const getDisabledDateForFrom = useMemoizedFn((current: Dayjs) => {
    // Only apply external disabledDate if provided
    if (disabledDate) {
      return disabledDate(current)
    }
    return false
  })

  // Pass through external disabledDate to DatePicker (no additional restrictions)
  const getDisabledDateForTo = useMemoizedFn((current: Dayjs) => {
    // Only apply external disabledDate if provided
    if (disabledDate) {
      return disabledDate(current)
    }
    return false
  })

  // Pass through external disabledTime to TimePicker (no additional restrictions)
  const getDisabledTimeForPicker = useMemoizedFn((type: 'start' | 'end') => {
    return () => {
      const date = type === 'start' ? fromDateTime : toDateTime
      const result: {
        disabledHours?: () => number[]
        disabledMinutes?: (selectedHour: number) => number[]
        disabledSeconds?: (
          selectedHour: number,
          selectedMinute: number
        ) => number[]
      } = {}

      // Apply external disabledTime if provided and date exists
      if (disabledTime && date) {
        const originalResult = disabledTime(date, type)
        if (originalResult) {
          Object.assign(result, originalResult)
        }
      }

      // Always return an object, even if empty
      return result
    }
  })

  const dropdownContent = (
    <div
      className={styles.dropdown_content_container}
      data-e2e="timerange_selector_dropdown"
    >
      <div className={styles.usual_time_ranges}>
        <span>
          {t(
            'statement.pages.overview.toolbar.time_range_selector.usual_time_ranges'
          )}
        </span>
        <div className={styles.time_range_items} data-e2e="common-timeranges">
          {recent_seconds.map((seconds) => (
            <div
              tabIndex={-1}
              key={seconds}
              className={cx(styles.time_range_item, {
                [styles.time_range_item_active]:
                  value && value.type === 'recent' && value.value === seconds
              })}
              onClick={() => handleRecentChange(seconds)}
              data-e2e={`timerange-${seconds}`}
            >
              {t('statement.pages.overview.toolbar.time_range_selector.recent')}{' '}
              {customAbsoluteRangePicker
                ? customValueFormat(seconds, 0)
                : getValueFormat('s')(seconds, 0)}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.custom_time_ranges}>
        <span>
          {t(
            'statement.pages.overview.toolbar.time_range_selector.custom_time_ranges'
          )}
        </span>
        <div style={{ marginTop: 8 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>From:</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <DatePicker
                value={fromDateTime}
                onChange={handleFromDateChange}
                format="YYYY-MM-DD"
                disabledDate={getDisabledDateForFrom}
                style={{ flex: 1 }}
              />
              <TimePicker
                value={fromDateTime as any}
                onChange={handleFromTimeChange as any}
                format="HH:mm:ss"
                disabledTime={getDisabledTimeForPicker('start')}
                style={{ flex: 1 }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>To:</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <DatePicker
                value={toDateTime}
                onChange={handleToDateChange}
                format="YYYY-MM-DD"
                disabledDate={getDisabledDateForTo}
                style={{ flex: 1 }}
              />
              <TimePicker
                value={toDateTime as any}
                onChange={handleToTimeChange as any}
                format="HH:mm:ss"
                disabledTime={getDisabledTimeForPicker('end')}
                style={{ flex: 1 }}
              />
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              marginTop: 12
            }}
          >
            <Button type="primary" onClick={handleOk} disabled={!!rangeError}>
              Ok
            </Button>
            {rangeError && (
              <div
                style={{
                  color: '#ff4d4f',
                  fontSize: '12px',
                  marginTop: 8,
                  textAlign: 'right'
                }}
              >
                {rangeError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <Dropdown
      overlay={dropdownContent}
      trigger={['click']}
      visible={dropdownVisible}
      onVisibleChange={setDropdownVisible}
      disabled={disabled}
    >
      <Button icon={<ClockCircleOutlined />} data-e2e="timerange-selector">
        {value && value.type === 'recent' && (
          <span data-e2e="selected_timerange">
            {t('statement.pages.overview.toolbar.time_range_selector.recent')}{' '}
            {customAbsoluteRangePicker
              ? customValueFormat(value.value, 0)
              : getValueFormat('s')(value.value, 0)}
          </span>
        )}
        {value && value.type === 'absolute' && (
          <span data-e2e="selected_timerange">
            {value.value
              .map((v) =>
                dayjs
                  .unix(v)
                  .utcOffset(tz.getTimeZone())
                  .format('MM-DD HH:mm:ss (UTCZ)')
              )
              .join(' ~ ')}
          </span>
        )}
        {!value && 'Select Time'}
        <DownOutlined />
      </Button>
    </Dropdown>
  )
}

const c = Object.assign(React.memo(TimeRangeSelector), {
  WithZoomOut: React.memo(WithZoomOut)
})

export default c
