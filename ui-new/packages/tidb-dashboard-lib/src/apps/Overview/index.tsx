import React, { useContext } from 'react'
import { Col, Row } from 'antd'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'

import { Root } from '@lib/components'
import { addTranslations } from '@lib/utils/i18n'

import MonitorAlert from './components/MonitorAlert'
import Instances from './components/Instances'
import Metrics from './components/Metrics'

import translations from './translations'
import { OverviewContext } from './context'
import { useLocationChange } from '@lib/hooks/useLocationChange'

addTranslations(translations)

function Overview() {
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

function AppRoutes() {
  useLocationChange()

  return (
    <Routes>
      <Route path="/overview" element={<Overview />} />
    </Routes>
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
