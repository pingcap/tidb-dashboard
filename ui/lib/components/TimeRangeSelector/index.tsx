import React, { useState, useMemo } from 'react'
import { Dropdown, Button } from 'antd'
import DatePicker from '../DatePicker'
import { ClockCircleOutlined, DownOutlined } from '@ant-design/icons'
import { getValueFormat } from '@baurine/grafana-value-formats'
import cx from 'classnames'
import dayjs, { Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'

import styles from './index.module.less'
import { useChange } from '@lib/utils/useChange'
import { useMemoizedFn } from 'ahooks'

const { RangePicker } = DatePicker

const RECENT_SECONDS = [
  5 * 60,
  15 * 60,
  30 * 60,
  60 * 60,
  2 * 60 * 60,
  6 * 60 * 60,
  12 * 60 * 60,
  24 * 60 * 60,
  2 * 24 * 60 * 60,
  7 * 24 * 60 * 60,
  14 * 24 * 60 * 60,
  28 * 24 * 60 * 60,
]

export const DEFAULT_TIME_RANGE: TimeRange = {
  type: 'recent',
  value: 30 * 60,
}

interface RecentSecTime {
  type: 'recent'
  value: number // unit: seconds
}

interface RangeTime {
  type: 'absolute'
  value: [number, number] // unit: seconds
}

export type TimeRange = RecentSecTime | RangeTime

export function calcTimeRange(timeRange?: TimeRange): [number, number] {
  let t2 = timeRange ?? DEFAULT_TIME_RANGE
  if (t2.type === 'absolute') {
    return t2.value
  } else {
    const now = dayjs().unix()
    return [now - t2.value, now]
  }
}

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
  disabledDate?: (currentDate: Dayjs) => boolean
  onVisibleChange?: (visible: boolean) => void
}

function TimeRangeSelector({
  value,
  onChange,
  disabled = false,
  disabledDate = () => false,
  onVisibleChange,
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
      value: seconds,
    })
    setDropdownVisible(false)
  })

  const handleRangePickerChange = useMemoizedFn((values) => {
    if (values === null) {
      onChange?.(DEFAULT_TIME_RANGE)
    } else {
      onChange?.({
        type: 'absolute',
        value: values.map((v) => v.unix()),
      })
    }
    setDropdownVisible(false)
  })

  const dropdownContent = (
    <div className={styles.dropdown_content_container}>
      <div className={styles.usual_time_ranges}>
        <span>
          {t(
            'statement.pages.overview.toolbar.time_range_selector.usual_time_ranges'
          )}
        </span>
        <div className={styles.time_range_items} data-e2e="common-timeranges">
          {RECENT_SECONDS.map((seconds) => (
            <div
              tabIndex={-1}
              key={seconds}
              className={cx(styles.time_range_item, {
                [styles.time_range_item_active]:
                  value && value.type === 'recent' && value.value === seconds,
              })}
              onClick={() => handleRecentChange(seconds)}
              data-e2e={`timerange-${seconds}`}
            >
              {t('statement.pages.overview.toolbar.time_range_selector.recent')}{' '}
              {getValueFormat('s')(seconds, 0)}
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
      onVisibleChange={(visible) => {
        setDropdownVisible(visible)
        onVisibleChange?.(visible)
      }}
      disabled={disabled}
    >
      <Button icon={<ClockCircleOutlined />} data-e2e="timerange-selector">
        {value && value.type === 'recent' && (
          <span data-e2e="selected_timerange">
            {t('statement.pages.overview.toolbar.time_range_selector.recent')}{' '}
            {getValueFormat('s')(value.value, 0)}
          </span>
        )}
        {value && value.type === 'absolute' && (
          <span data-e2e="selected_timerange">
            {value.value
              .map((v) => dayjs.unix(v).format('MM-DD HH:mm:ss'))
              .join(' ~ ')}
          </span>
        )}
        {!value && 'Select Time'}
        <DownOutlined />
      </Button>
    </Dropdown>
  )
}

export default React.memo(TimeRangeSelector)
