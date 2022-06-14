import { Col, Row } from 'antd'
import React from 'react'
import { HashRouter as Router } from 'react-router-dom'
import { Root } from '@lib/components'
import MonitorAlert from './components/MonitorAlert'
import Instances from './components/Instances'
import Metrics from './components/Metrics'

export default function App() {
  return (
    <Root>
      <Router>
        <Row>
          <Col span={18}>
            <Metrics />
          </Col>
          <Col span={6}>
            <Instances />
            <MonitorAlert />
          </Col>
        </Row>
      </Router>
    </Root>
  )
}
