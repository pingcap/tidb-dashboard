import React, { useState, useEffect } from 'react'
import { Dropdown, Button, DatePicker } from 'antd'
import { ClockCircleOutlined, DownOutlined } from '@ant-design/icons'
import { getValueFormat } from '@baurine/grafana-value-formats'
import cx from 'classnames'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

import styles from './TimeRangeSelector.module.less'
import { Moment } from 'moment'

const { RangePicker } = DatePicker

const RECENT_MINS = [30, 60, 3 * 60, 6 * 60, 12 * 60, 24 * 60]

export interface TimeRange {
  recent: number
  begin_time: number
  end_time: number
}

export const DEF_TIME_RANGE: TimeRange = {
  recent: 30,
  begin_time: dayjs().unix() - 30 * 60,
  end_time: dayjs().unix(),
}

export interface ITimeRangeSelectorProps {
  value: TimeRange
  onChange: (val: TimeRange) => void
}

export default function TimeRangeSelector({
  value,
  onChange,
}: ITimeRangeSelectorProps) {
  const { t } = useTranslation()
  const [curTimeRange, setCurTimeRange] = useState<TimeRange>(value)
  const [dropdownVisible, setDropdownVisible] = useState(false)

  useEffect(() => {
    setCurTimeRange(value)
  }, [value])

  function handleRecentChange(mins: number) {
    const now = dayjs().unix()
    const beginTime = now - mins * 60
    const timeRange = {
      recent: mins,
      begin_time: beginTime,
      end_time: now,
    }
    setCurTimeRange(timeRange)
    onChange(timeRange)
    setDropdownVisible(false)
  }

  function handleRangePickerChange(values) {
    if (values === null) {
      if (curTimeRange.recent === 0) {
        handleRecentChange(30)
      }
    } else {
      const timeRange = {
        recent: 0,
        begin_time: (values[0] as Moment).unix(),
        end_time: (values[1] as Moment).unix(),
      }
      setCurTimeRange(timeRange)
      onChange(timeRange)
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
          {RECENT_MINS.map((mins) => (
            <div
              tabIndex={-1}
              key={mins}
              className={cx(styles.time_range_item, {
                [styles.time_range_item_active]: mins === curTimeRange.recent,
              })}
              onClick={() => handleRecentChange(mins)}
            >
              {t('statement.pages.overview.toolbar.time_range_selector.recent')}{' '}
              {getValueFormat('m')(mins, 0)}
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
        {curTimeRange.recent > 0 ? (
          <span>
            {t('statement.pages.overview.toolbar.time_range_selector.recent')}{' '}
            {getValueFormat('m')(curTimeRange.recent, 0)}
          </span>
        ) : (
          <span>
            {dayjs.unix(curTimeRange.begin_time!).format('MM-DD HH:mm:ss')} ~{' '}
            {dayjs.unix(curTimeRange.end_time!).format('MM-DD HH:mm:ss')}
          </span>
        )}
        <DownOutlined />
      </Button>
    </Dropdown>
  )
}
