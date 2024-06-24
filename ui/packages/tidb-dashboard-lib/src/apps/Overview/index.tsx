import React, { useContext } from 'react'
import { HashRouter as Router } from 'react-router-dom'
import { Col, Row } from 'antd'

import { Root } from '@lib/components'
import { addTranslations } from '@lib/utils/i18n'

import translations from './translations'
import { OverviewContext } from './context'
import { useLocationChange } from '@lib/hooks/useLocationChange'
import Instances from './components/Instances'
import Metrics from './components/Metrics'
import MonitorAlert from './components/MonitorAlert'

addTranslations(translations)

function AppRoutes() {
  useLocationChange()
  const ctx = useContext(OverviewContext)

  if (ctx?.cfg.showMetrics) {
    return (
      <Row>
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

  return (
    <Row>
      <Col span={8}>
        <Instances />
      </Col>
    </Row>
  )
}

export default function () {
  const ctx = useContext(OverviewContext)
  if (ctx === null) {
    throw new Error('OverviewContext must not be null')
  }

  return (
    <Root>
      <Router>
        <AppRoutes />
      </Router>
    </Root>
  )
}

export * from './context'
