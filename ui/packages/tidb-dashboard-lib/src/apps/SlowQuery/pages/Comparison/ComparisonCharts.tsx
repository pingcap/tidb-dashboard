import React, { useState } from 'react'
import { Col, Row, Select, Typography } from 'antd'

import { TimeRange, TimeRangeSelector } from '@lib/components'
import { TimeSeriesChart } from '../../components/charts/TimeSeriesChart'
import { GroupBarChart } from './charts/GroupBarChart'
import { DiffChart } from './charts/DiffChart'

const { Title } = Typography

export const ComparisonCharts: React.FC = () => {
  const [timeRange, onTimeRangeChange] = useState<any>()
  return (
    <>
      <TimeRanges timeRange={timeRange} onTimeRangeChange={onTimeRangeChange} />
      <Row style={{ marginTop: '20px' }}>
        <Col span={12} style={{ padding: '10px 10px 10px 0' }}>
          <Row>
            <Col span={12}>
              <Title level={5}>Slow Query Count</Title>
              <TimeSeriesChart timeRange={timeRange} height={300} type="line" />
            </Col>
            <Col span={12}>
              <Title level={5}>Avg. Slow Query Latency</Title>
              <TimeSeriesChart timeRange={timeRange} height={300} type="line" />
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
                timeRange={timeRange}
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
              <TimeSeriesChart timeRange={timeRange} height={300} type="line" />
            </Col>
            <Col span={12}>
              <Title level={5}>Avg. Slow Query Latency</Title>
              <TimeSeriesChart timeRange={timeRange} height={300} type="line" />
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
                timeRange={timeRange}
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
  timeRange: TimeRange
  onTimeRangeChange: (val: TimeRange) => void
}

const TimeRanges: React.FC<TimeRangesProps> = ({
  timeRange,
  onTimeRangeChange
}) => {
  return (
    <Row>
      <Col span={24} style={{ marginBottom: '10px' }}>
        Comparison Time Range:{' '}
        <Select
          defaultValue="same"
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
        />
      </Col>
      <Col span={12}>
        Period A:{' '}
        <TimeRangeSelector value={timeRange} onChange={onTimeRangeChange} />
      </Col>
      <Col span={12} style={{ paddingLeft: '10px' }}>
        Period B:{' '}
        <TimeRangeSelector value={timeRange} onChange={onTimeRangeChange} />
      </Col>
    </Row>
  )
}
