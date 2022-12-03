import React, { useState } from 'react'
import { Col, Row, Select, Typography } from 'antd'

import {
  DEFAULT_TIME_RANGE,
  TimeRange,
  TimeRangeValue,
  toTimeRangeValue,
  DatePicker
} from '@lib/components'
import { TimeSeriesChart } from '../../components/charts/TimeSeriesChart'
import { GroupBarChart } from './charts/GroupBarChart'
import { DiffChart } from './charts/DiffChart'
import { DisplayOptions } from '../ListV2/Selections'
import { useURLTimeRangeToTimeRange } from '../ListV2'
import useUrlState from '@ahooksjs/use-url-state'
import dayjs from 'dayjs'
import { tz } from '@lib/utils'
import { LimitTimeRange } from '../../components/LimitTimeRange'

const { Title } = Typography

interface ComparisonChartsProps {
  selection: DisplayOptions
}

export const ComparisonCharts: React.FC<ComparisonChartsProps> = ({
  selection
}) => {
  const { timeRange: timeRangeA, setTimeRange: onTimeRangeAChange } =
    useURLTimeRangeToTimeRange(DEFAULT_TIME_RANGE)
  const { timeRange: timeRangeB, setTimeRange: onTimeRangeBChange } =
    useURLTimeRangeToTimeRange(
      getTimeRangeBFrom(timeRangeA),
      TIMERANGE_B_TYPE_KEY,
      TIMERANGE_B_VALUE_KEY
    )

  return (
    <>
      <TimeRanges
        timeRangeA={timeRangeA}
        onTimeRangeAChange={onTimeRangeAChange}
        timeRangeB={timeRangeB}
        onTimeRangeBChange={onTimeRangeBChange}
      />
      <Row style={{ marginTop: '20px' }}>
        <Col span={12} style={{ padding: '10px 10px 10px 0' }}>
          <Row>
            <Col span={12}>
              <Title level={5}>Slow Query Count</Title>
              <TimeSeriesChart
                timeRange={timeRangeA}
                height={300}
                type="line"
              />
            </Col>
            <Col span={12}>
              <Title level={5}>Avg. Slow Query Latency</Title>
              <TimeSeriesChart
                timeRange={timeRangeA}
                height={300}
                type="line"
              />
            </Col>
          </Row>
          <Row style={{ marginTop: '10px' }}>
            <Col span={12}>
              <Title level={5}>Avg. Slow Query Count by </Title>
              <GroupBarChart height={600} />
            </Col>
            <Col span={12}>
              <Title level={5}>Avg. Slow Query Latency by </Title>
              <GroupBarChart height={600} />
            </Col>
          </Row>
          <Row style={{ marginTop: '10px' }}>
            <Col span={24}>
              <Title level={5}>Slow Query Detail</Title>
              <TimeSeriesChart
                timeRange={timeRangeA}
                height={400}
                type="scatter"
              />
            </Col>
          </Row>
        </Col>

        <Col span={12} style={{ background: '#fafafa', padding: '10px' }}>
          <Row>
            <Col span={12}>
              <Title level={5}>Slow Query Count</Title>
              <TimeSeriesChart
                timeRange={timeRangeB}
                height={300}
                type="line"
              />
            </Col>
            <Col span={12}>
              <Title level={5}>Avg. Slow Query Latency</Title>
              <TimeSeriesChart
                timeRange={timeRangeB}
                height={300}
                type="line"
              />
            </Col>
          </Row>
          <Row style={{ marginTop: '10px' }}>
            <Col span={12}>
              <Title level={5}>Avg. Slow Query Count by </Title>
              <DiffChart height={600} />
            </Col>
            <Col span={12}>
              <Title level={5}>Avg. Slow Query Latency by </Title>
              <DiffChart height={600} />
            </Col>
          </Row>
          <Row style={{ marginTop: '10px' }}>
            <Col span={24}>
              <Title level={5}>Slow Query Detail</Title>
              <TimeSeriesChart
                timeRange={timeRangeB}
                height={400}
                type="scatter"
              />
            </Col>
          </Row>
        </Col>
      </Row>
    </>
  )
}

interface TimeRangesProps {
  timeRangeA: TimeRange
  timeRangeB: TimeRange
  onTimeRangeAChange: (val: TimeRange) => void
  onTimeRangeBChange: (val: TimeRange) => void
}

type ComparisonType = 'same' | 'custom'

const TimeRanges: React.FC<TimeRangesProps> = ({
  timeRangeA,
  timeRangeB,
  onTimeRangeAChange,
  onTimeRangeBChange
}) => {
  const [urlState, setURLState] = useUrlState({
    [COMPARISON_TYPE_KEY]: 'same'
  })
  return (
    <Row>
      <Col span={24} style={{ marginBottom: '10px' }}>
        Comparison Time Range:{' '}
        <Select
          defaultValue={urlState[COMPARISON_TYPE_KEY]}
          style={{ width: 120 }}
          options={[
            {
              value: 'same',
              label: 'Same'
            },
            {
              value: 'custom',
              label: 'Custom'
            }
          ]}
          onChange={(v) => {
            setURLState({
              [COMPARISON_TYPE_KEY]: v,
              // reset time range b when comparison type change from custom to same
              ...(v === 'same'
                ? {
                    timeRangeBType: 'absolute',
                    timeRangeBValue: getTimeRangeBFrom(timeRangeA).value
                  }
                : {})
            })
          }}
        />
      </Col>
      <Col span={12}>
        Period A:{' '}
        <LimitTimeRange value={timeRangeA} onChange={onTimeRangeAChange} />
      </Col>
      <Col span={12} style={{ paddingLeft: '10px' }}>
        Period B:{' '}
        <TimeRangeB
          comparisonType={urlState.comparisonType}
          timeRange={timeRangeB}
          onTimeRangeChange={onTimeRangeBChange}
          timeRangeRefer={timeRangeA}
        />
      </Col>
    </Row>
  )
}

interface TimeRangeBProps {
  comparisonType: ComparisonType
  timeRange: TimeRange
  onTimeRangeChange: (val: TimeRange) => void
  timeRangeRefer: TimeRange
}

const disabledDate = (current) => {
  return current && current > dayjs().startOf('day')
}

const TimeRangeB: React.FC<TimeRangeBProps> = ({
  comparisonType,
  timeRange,
  onTimeRangeChange,
  timeRangeRefer
}) => {
  const [timeRangeValue, setTimeRangeValue] = useState(
    dayjs(timeRange.value[0] * 1000)
  )
  return comparisonType === 'same' ? (
    <>
      <DatePicker
        value={timeRangeValue}
        onChange={(v) => {
          const timeRangeReferValue = toTimeRangeValue(timeRangeRefer)
          const timeRangeReferDayjs = dayjs(timeRangeReferValue[0] * 1000)
          const newTimeRange = dayjs(
            timeRangeReferDayjs.add(
              v?.diff(timeRangeReferDayjs, 'day') || 0,
              'day'
            )
          )
          setTimeRangeValue(newTimeRange)

          const unixTimestamp = newTimeRange.unix()
          const diff = timeRangeReferValue[1] - timeRangeReferValue[0]
          onTimeRangeChange({
            type: 'absolute',
            value: [unixTimestamp, unixTimestamp + diff]
          })
        }}
        disabledDate={disabledDate}
        showToday={false}
        allowClear={false}
      />{' '}
      <span>
        {toTimeRangeValue(timeRange)
          .map((v) =>
            dayjs
              .unix(v)
              .utcOffset(tz.getTimeZone())
              .format('MM-DD HH:mm:ss (UTCZ)')
          )
          .join(' ~ ')}
      </span>
    </>
  ) : (
    <LimitTimeRange value={timeRange} onChange={onTimeRangeChange} />
  )
}

const getTimeRangeBFrom = (timeRangeA: TimeRange): TimeRange => {
  const timeRangeAValue = toTimeRangeValue(timeRangeA)
  return {
    type: 'absolute',
    value: timeRangeAValue.map((v) => v - 24 * 60 * 60) as TimeRangeValue
  }
}

const COMPARISON_TYPE_KEY = 'comparisonType'
const TIMERANGE_B_TYPE_KEY = 'timeRangeBType'
const TIMERANGE_B_VALUE_KEY = 'timeRangeBValue'
const SPECIAL_QUERY_KEYS = [
  COMPARISON_TYPE_KEY,
  TIMERANGE_B_TYPE_KEY,
  TIMERANGE_B_VALUE_KEY
]
export const deleteSpecialTimeRangeQuery = (urlParams: URLSearchParams) => {
  SPECIAL_QUERY_KEYS.forEach((k) => urlParams.delete(k))
}
