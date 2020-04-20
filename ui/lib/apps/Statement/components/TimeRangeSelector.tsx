import React, { useState, useMemo, useEffect } from 'react'
import { Dropdown, Button, Slider } from 'antd'
import { ClockCircleOutlined, DownOutlined } from '@ant-design/icons'
import { getValueFormat } from '@baurine/grafana-value-formats'
import cx from 'classnames'
import dayjs from 'dayjs'

import { StatementTimeRange } from '@lib/client'

import styles from './TimeRangeSelector.module.less'

const RECENT_MINS = [30, 60, 3 * 60, 6 * 60, 12 * 60, 24 * 60]

// timePoints are descent array
function findNearTimePoint(timePoint: number, timePoints: number[]): number {
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

function calcTime(timeRanges: StatementTimeRange[]) {
  const allBeginTime = timeRanges.map((t) => t.begin_time!)
  const allEndTime = timeRanges.map((t) => t.end_time!)
  const minBeginTime: number = allBeginTime[allBeginTime.length - 1] || 0
  const maxBeginTime: number = allBeginTime[0] || 0
  const maxEndTime: number = allEndTime[0] || 0
  const latestTimeRange = {
    begin_time: maxBeginTime,
    end_time: maxEndTime,
  }
  return {
    allBeginTime,
    allEndTime,
    minBeginTime,
    maxBeginTime,
    maxEndTime,
    latestTimeRange,
  }
}

export interface ITimeRangeSelectorProps {
  timeRanges: StatementTimeRange[]
  onChange: (val: StatementTimeRange) => void
}

export default function TimeRangeSelector({
  timeRanges,
  onChange,
}: ITimeRangeSelectorProps) {
  const { allBeginTime, allEndTime, minBeginTime, maxEndTime } = useMemo(
    () => calcTime(timeRanges),
    [timeRanges]
  )
  const [curTimeRange, setCurTimeRange] = useState<StatementTimeRange>(() => {
    const { latestTimeRange } = calcTime(timeRanges)
    return latestTimeRange
  })
  const [curRecent, setCurRecent] = useState(30)

  useEffect(() => {
    setCurTimeRange(calcTime(timeRanges).latestTimeRange)
  }, [timeRanges])

  function handleTimeRangeChange(mins: number) {
    setCurRecent(mins)
    const beginTime = findNearTimePoint(
      dayjs().unix() - mins * 60,
      allBeginTime
    )
    const timeRange = {
      begin_time: beginTime,
      end_time: maxEndTime,
    }
    setCurTimeRange(timeRange)
    onChange(timeRange)
  }

  function handleSliderChange(values) {
    setCurRecent(0)
    const nearBeginTime = findNearTimePoint(
      (values as [number, number])[0],
      allBeginTime
    )
    const nearEndTime = findNearTimePoint(
      (values as [number, number])[1],
      allEndTime
    )
    const timeRange = {
      begin_time: nearBeginTime,
      end_time: nearEndTime,
    }
    setCurTimeRange(timeRange)
    onChange(timeRange)
  }

  const dropdownContent = (
    <div className={styles.dropdown_content_container}>
      <div className={styles.fixed_time_ranges}>
        <span>常用时间范围</span>
        <div className={styles.time_range_items}>
          {RECENT_MINS.map((mins) => (
            <div
              tabIndex={-1}
              key={mins}
              className={cx(styles.time_range_item, {
                [styles.time_range_item_active]: mins === curRecent,
              })}
              onClick={() => handleTimeRangeChange(mins)}
            >
              最近 {getValueFormat('m')(mins, 0)}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.custom_time_ranges}>
        <span>自定义时间范围</span>
        <Slider
          min={minBeginTime}
          max={maxEndTime}
          step={60}
          range
          value={[curTimeRange.begin_time!, curTimeRange.end_time!]}
          onChange={handleSliderChange}
          tipFormatter={(val) => dayjs.unix(val).format('HH:mm')}
        />
        <span>
          {dayjs.unix(curTimeRange.begin_time!).format('MM-DD HH:mm')} ~{' '}
          {dayjs.unix(curTimeRange.end_time!).format('MM-DD HH:mm')}
        </span>
      </div>
    </div>
  )

  return (
    <Dropdown overlay={dropdownContent} trigger={['click']}>
      <Button icon={<ClockCircleOutlined />}>
        {curRecent > 0 ? (
          <span>最近 {getValueFormat('m')(curRecent, 0)}</span>
        ) : (
          <span>
            {dayjs.unix(curTimeRange.begin_time!).format('MM-DD HH:mm')} ~{' '}
            {dayjs.unix(curTimeRange.end_time!).format('MM-DD HH:mm')}
          </span>
        )}
        <DownOutlined />
      </Button>
    </Dropdown>
  )
}
