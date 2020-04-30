import React, { useState, useMemo } from 'react'
import { Dropdown, Button, DatePicker } from 'antd'
import { ClockCircleOutlined, DownOutlined } from '@ant-design/icons'
import { getValueFormat } from '@baurine/grafana-value-formats'
import cx from 'classnames'
import dayjs from 'dayjs'
import moment, { Moment } from 'moment'
import { useTranslation } from 'react-i18next'

import styles from './index.module.less'

const { RangePicker } = DatePicker

const RECENT_SECONDS = [
  30 * 60,
  60 * 60,
  3 * 60 * 60,
  6 * 60 * 60,
  12 * 60 * 60,
  24 * 60 * 60,
]

export interface RecentSecTime {
  type: 'recent'
  value: number // unit: seconds
}

export interface RangeTime {
  type: 'absolute'
  value: [number, number] // unit: seconds
}

export type TimeRange = RecentSecTime | RangeTime

export const DEF_TIME_RANGE: TimeRange = {
  type: 'recent',
  value: 30 * 60,
}

export function calcTimeRange(timeRange: TimeRange): [number, number] {
  if (timeRange.type === 'absolute') {
    return timeRange.value
  } else {
    const now = dayjs().unix()
    return [now - timeRange.value, now]
  }
}

export interface ITimeRangeSelectorProps {
  value: TimeRange
  onChange: (val: TimeRange) => void
}

export default function TimeRangeSelector({
  value: curTimeRange,
  onChange,
}: ITimeRangeSelectorProps) {
  const { t } = useTranslation()
  const [dropdownVisible, setDropdownVisible] = useState(false)

  const rangePickerValue = useMemo(() => {
    return curTimeRange.type === 'absolute'
      ? ([
          moment(curTimeRange.value[0] * 1000),
          moment(curTimeRange.value[1] * 1000),
        ] as [Moment, Moment])
      : null
  }, [curTimeRange])

  function handleRecentChange(seconds: number) {
    onChange({
      type: 'recent',
      value: seconds,
    })
    setDropdownVisible(false)
  }

  function handleRangePickerChange(values) {
    if (values === null) {
      if (curTimeRange.type === 'absolute') {
        handleRecentChange(30 * 60)
      }
    } else {
      onChange({
        type: 'absolute',
        value: [values[0].unix(), values[1].unix()],
      })
      setDropdownVisible(false)
    }
  }

  const dropdownContent = (
    <div className={styles.dropdown_content_container}>
      <div className={styles.usual_time_ranges}>
        <span>
          {t(
            'statement.pages.overview.toolbar.time_range_selector.usual_time_ranges'
          )}
        </span>
        <div className={styles.time_range_items}>
          {RECENT_SECONDS.map((seconds) => (
            <div
              tabIndex={-1}
              key={seconds}
              className={cx(styles.time_range_item, {
                [styles.time_range_item_active]:
                  curTimeRange.type === 'recent' &&
                  curTimeRange.value === seconds,
              })}
              onClick={() => handleRecentChange(seconds)}
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
    >
      <Button icon={<ClockCircleOutlined />}>
        {curTimeRange.type === 'recent' ? (
          <span>
            {t('statement.pages.overview.toolbar.time_range_selector.recent')}{' '}
            {getValueFormat('s')(curTimeRange.value, 0)}
          </span>
        ) : (
          <span>
            {dayjs.unix(curTimeRange.value[0]).format('MM-DD HH:mm:ss')} ~{' '}
            {dayjs.unix(curTimeRange.value[1]).format('MM-DD HH:mm:ss')}
          </span>
        )}
        <DownOutlined />
      </Button>
    </Dropdown>
  )
}
