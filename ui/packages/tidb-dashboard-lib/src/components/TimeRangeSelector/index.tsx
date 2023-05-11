import React, { useState, useMemo } from 'react'
import { Dropdown, Button } from 'antd'
import DatePicker from '../DatePicker'
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

const { RangePicker } = DatePicker

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
  customAbsoluteRangePicker = false
}: ITimeRangeSelectorProps) {
  const { t } = useTranslation()
  const [dropdownVisible, setDropdownVisible] = useState(false)

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

  const handleRecentChange = useMemoizedFn((seconds: number) => {
    onChange?.({
      type: 'recent',
      value: seconds
    })
    setDropdownVisible(false)
  })

  const handleRangePickerChange = useMemoizedFn((values) => {
    if (values === null) {
      onChange?.(DEFAULT_TIME_RANGE)
    } else {
      onChange?.({
        type: 'absolute',
        value: values.map((v) => v.unix())
      })
    }
    setDropdownVisible(false)
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
          <RangePicker
            showTime
            format="YYYY-MM-DD HH:mm:ss"
            value={rangePickerValue}
            onChange={handleRangePickerChange}
            disabledDate={disabledDate}
            disabledTime={disabledTime}
            onCalendarChange={onCalendarChange}
            onOpenChange={onOpenChange}
          />
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
