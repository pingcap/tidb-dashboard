import { Col, Row } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { HashRouter as Router } from 'react-router-dom'

import { MetricChart, Root } from '@lib/components'

import MonitorAlert from './components/MonitorAlert'
import Instances from './components/Instances'
import RecentStatements from './components/RecentStatements'
import RecentSlowQueries from './components/RecentSlowQueries'

function QPS() {
  const { t } = useTranslation()

  return (
    <MetricChart
      title={t('overview.metrics.total_requests')}
      series={[
        {
          query: 'sum(rate(tidb_server_query_total[1m])) by (result)',
          name: 'Queries {result}',
        },
      ]}
      unit="qps"
      type="bar"
    />
  )
}

function Latency() {
  const { t } = useTranslation()

  return (
    <MetricChart
      title={t('overview.metrics.latency')}
      series={[
        {
          query:
            'histogram_quantile(0.999, sum(rate(tidb_server_handle_query_duration_seconds_bucket[1m])) by (le))',
          name: '99.9%',
        },
        {
          query:
            'histogram_quantile(0.99, sum(rate(tidb_server_handle_query_duration_seconds_bucket[1m])) by (le))',
          name: '99%',
        },
        {
          query:
            'histogram_quantile(0.9, sum(rate(tidb_server_handle_query_duration_seconds_bucket[1m])) by (le))',
          name: '90%',
        },
      ]}
      unit="s"
      type="line"
    />
  )
}

export default function App() {
  return (
    <Root>
      <Router>
        <Row>
          <Col span={18}>
            <QPS />
            <Latency />
            <RecentStatements />
            <RecentSlowQueries />
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
