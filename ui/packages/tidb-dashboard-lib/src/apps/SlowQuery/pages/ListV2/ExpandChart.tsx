import React, { useState } from 'react'
import { Col, Modal, Row, Typography } from 'antd'

import { TimeSeriesChart } from '../../components/charts/TimeSeriesChart'

interface ExpandChartProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const { Title } = Typography

export const ExpandChart: React.FC<ExpandChartProps> = ({
  open,
  onOpenChange
}) => {
  const [timeRange, onTimeRangeChange] = useState<any>()
  return (
    <Modal
      centered
      visible={open}
      onCancel={() => onOpenChange(false)}
      width="100%"
      bodyStyle={{
        height: '768px',
        padding: '10px'
      }}
      footer={null}
    >
      <Row style={{ paddingTop: '20px' }}>
        <Col span={16}>
          <Title level={5}>Slow Query Detail</Title>
          <TimeSeriesChart
            timeRange={timeRange}
            height={632}
            type="scatter"
            promql="query_time"
            name="{query}"
            unit="s"
          />
        </Col>
        <Col span={8}>
          <Row>
            <Col span={24}>
              <Title level={5}>Slow Query Count</Title>
              <TimeSeriesChart
                timeRange={timeRange}
                height={300}
                type="line"
                promql="query_time"
                name="{query}"
                unit="short"
              />
            </Col>
          </Row>
          <Row>
            <Col span={24}>
              <Title level={5}>Avg. Slow Query Latency</Title>
              <TimeSeriesChart
                timeRange={timeRange}
                height={300}
                type="line"
                promql="query_time"
                name="{query}"
                unit="s"
              />
            </Col>
          </Row>
        </Col>
      </Row>
    </Modal>
  )
}
