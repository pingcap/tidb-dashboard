import React, { useState, useMemo, useEffect } from 'react'
import { Dropdown, Button, Slider } from 'antd'
import { ClockCircleOutlined, DownOutlined } from '@ant-design/icons'
import { getValueFormat } from '@baurine/grafana-value-formats'
import cx from 'classnames'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

import { StatementTimeRange } from '@lib/client'

import styles from './TimeRangeSelector.module.less'

// This component looks similar with @lib/component/TimeRangeSelector,
// but they have totally different logic, so it prefers to not reuse their duplicated part

const RECENT_SECONDS = [
  15 * 60,
  30 * 60,
  60 * 60,

  2 * 60 * 60,
  6 * 60 * 60,
  12 * 60 * 60,

  24 * 60 * 60,
  2 * 24 * 60 * 60,
  3 * 24 * 60 * 60,

  7 * 24 * 60 * 60,
  14 * 24 * 60 * 60,
  28 * 24 * 60 * 60,
]

interface RecentSecTime {
  type: 'recent'
  value: number // unit: seconds
}

interface RangeTime {
  type: 'absolute'
  value: [number, number] // unit: seconds
}

export type TimeRange = RecentSecTime | RangeTime

export const DEFAULT_TIME_RANGE: TimeRange = {
  type: 'recent',
  value: 30 * 60,
}

export function stringifyTimeRange(timeRange?: TimeRange): string {
  let t2 = timeRange ?? DEFAULT_TIME_RANGE
  if (t2.type === 'absolute') {
    return `${t2.type}_${t2.value[0]}_${t2.value[1]}`
  } else {
    return `${t2.type}_${t2.value}`
  }
}

// timePoints are descent array
function findNearTimePoint(timePoint: number, timePoints: number[]): number {
  if (timePoints.length === 0) {
    return timePoint
  }
  if (timePoints.length === 1) {
    return timePoints[0]
  }
  let cur = timePoints[0]
  for (let i = 0; i < timePoints.length; i++) {
    cur = timePoints[i]
    if (cur > timePoint) {
      continue
    }
    // find the first value less than or equal with timePoint
    if (i === 0) {
      return cur
    }
    const pre = timePoints[i - 1]
    if (pre - timePoint < timePoint - cur) {
      return pre
    } else {
      return cur
    }
  }
  return cur
}

function calcAllTime(timeRanges: StatementTimeRange[]) {
  const allBeginTime = timeRanges.map((t) => t.begin_time!)
  const allEndTime = timeRanges.map((t) => t.end_time!)
  const minBeginTime: number = allBeginTime[allBeginTime.length - 1] || 0
  const maxBeginTime: number = allBeginTime[0] || 0
  const maxEndTime: number = allEndTime[0] || 0
  return {
    allBeginTime,
    allEndTime,
    minBeginTime,
    maxBeginTime,
    maxEndTime,
  }
}

export function calcValidStatementTimeRange(
  curTimeRange: TimeRange,
  timeRanges: StatementTimeRange[]
): StatementTimeRange {
  const { allBeginTime, allEndTime, maxEndTime } = calcAllTime(timeRanges)
  if (curTimeRange.type === 'recent') {
    const beginTime = findNearTimePoint(
      maxEndTime - curTimeRange.value,
      allBeginTime
    )
    return {
      begin_time: beginTime,
      end_time: maxEndTime,
    }
  } else {
    const nearBeginTime = findNearTimePoint(curTimeRange.value[0], allBeginTime)
    const nearEndTime = findNearTimePoint(curTimeRange.value[1], allEndTime)
    return {
      begin_time: nearBeginTime,
      end_time: nearEndTime,
    }
  }
}

function calcCommonTimeRange(
  minServerDataTime: number,
  maxServerDataTime: number
): { enabled: boolean; value: number }[] {
  if (!maxServerDataTime) {
    return RECENT_SECONDS.map((s) => ({ enabled: false, value: s }))
  }
  const validTimeRange = maxServerDataTime - minServerDataTime
  return RECENT_SECONDS.map((s) => ({ enabled: s <= validTimeRange, value: s }))
}

export interface ITimeRangeSelectorProps {
  value: TimeRange
  timeRanges: StatementTimeRange[]
  onChange: (val: TimeRange) => void
}

export default function TimeRangeSelector({
  value: curTimeRange,
  timeRanges,
  onChange,
}: ITimeRangeSelectorProps) {
  const { t } = useTranslation()
  const { minBeginTime, maxEndTime } = useMemo(
    () => calcAllTime(timeRanges),
    [timeRanges]
  )
  const [sliderTimeRange, setSliderTimeRange] = useState<StatementTimeRange>(
    () => calcValidStatementTimeRange(curTimeRange, timeRanges)
  )
  const [dropdownVisible, setDropdownVisible] = useState(false)
  const commonTimeRange = useMemo(
    () => calcCommonTimeRange(minBeginTime, maxEndTime),
    [minBeginTime, maxEndTime]
  )

  useEffect(() => {
    setSliderTimeRange(calcValidStatementTimeRange(curTimeRange, timeRanges))
  }, [curTimeRange, timeRanges])

  function handleRecentChange(seconds: number) {
    const timeRange: TimeRange = {
      type: 'recent',
      value: seconds,
    }
    onChange(timeRange)

    setSliderTimeRange(calcValidStatementTimeRange(timeRange, timeRanges))
    setDropdownVisible(false)
  }

  function handleSliderChange(values: [number, number]) {
    if (values.every((v) => v === 0)) {
      return
    }

    const timeRange: TimeRange = {
      type: 'absolute',
      value: values,
    }
    setSliderTimeRange(calcValidStatementTimeRange(timeRange, timeRanges))
  }

  function handleSliderAfterChange(values) {
    onChange({
      type: 'absolute',
      value: values,
    })
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
          {commonTimeRange.map(({ enabled, value: seconds }) => (
            <div
              tabIndex={-1}
              key={seconds}
              className={cx(styles.time_range_item, {
                [styles.time_range_item_disabled]: !enabled,
                [styles.time_range_item_active]:
                  curTimeRange.type === 'recent' &&
                  curTimeRange.value === seconds,
              })}
              onClick={() => enabled && handleRecentChange(seconds)}
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
        <Slider
          min={minBeginTime}
          max={maxEndTime}
          step={60}
          range
          value={[sliderTimeRange.begin_time!, sliderTimeRange.end_time!]}
          onChange={handleSliderChange}
          onAfterChange={handleSliderAfterChange}
          tipFormatter={(val) => dayjs.unix(val!).format('HH:mm')}
        />
        <span>
          {dayjs.unix(sliderTimeRange.begin_time!).format('MM-DD HH:mm')} ~{' '}
          {dayjs.unix(sliderTimeRange.end_time!).format('MM-DD HH:mm')}
        </span>
      </div>
    </div>
  )

  return (
    <Dropdown
      disabled={timeRanges.length === 0}
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
            {dayjs.unix(sliderTimeRange.begin_time!).format('MM-DD HH:mm')} ~{' '}
            {dayjs.unix(sliderTimeRange.end_time!).format('MM-DD HH:mm')}
          </span>
        )}
        <DownOutlined />
      </Button>
    </Dropdown>
  )
}
