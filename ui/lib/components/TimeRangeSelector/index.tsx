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

const RECENT_MINS = [30, 60, 3 * 60, 6 * 60, 12 * 60, 24 * 60]

export interface TimeRange {
  recent: number // 0 means absolute time range, else means relative time range
  begin_time: number
  end_time: number
}

function calcTimeRange(mins: number): TimeRange {
  const now = dayjs().unix()
  return {
    recent: mins,
    begin_time: now - mins * 60,
    end_time: now,
  }
}

export function getDefTimeRange(): TimeRange {
  return calcTimeRange(30)
}

export function refreshTimeRange(timeRange: TimeRange): TimeRange {
  const { recent } = timeRange
  if (recent === 0) {
    return timeRange
  } else {
    return calcTimeRange(recent)
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
    return curTimeRange.recent === 0
      ? ([
          moment(curTimeRange.begin_time * 1000),
          moment(curTimeRange.end_time * 1000),
        ] as [Moment, Moment])
      : null
  }, [curTimeRange])

  function handleRecentChange(mins: number) {
    onChange(calcTimeRange(mins))
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
        begin_time: values[0].unix(),
        end_time: values[1].unix(),
      }
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
