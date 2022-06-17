import React, { useContext } from 'react'
import { Col, Row } from 'antd'
import { HashRouter as Router } from 'react-router-dom'

import { Root } from '@lib/components'
import { addTranslations } from '@lib/utils/i18n'

import MonitorAlert from './components/MonitorAlert'
import Instances from './components/Instances'
import Metrics from './components/Metrics'

import translations from './translations'
import { OverviewContext } from './context'

addTranslations(translations)

export default function App() {
  const ctx = useContext(OverviewContext)
  if (ctx === null) {
    throw new Error('OverviewContext must not be null')
  }

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

export * from './context'
