import { Col, Row } from 'antd'
import React from 'react'
import MonitorAlert from '../../components/MonitorAlert'
import Instances from '../../components/Instances'
import Metrics from '../../components/Metrics'

export default function List() {
  return (
    <Row gutter={16}>
      <Col span={18}>
        <Metrics />
      </Col>
      <Col span={6}>
        <Instances />
        <MonitorAlert />
      </Col>
    </Row>
  )
}
