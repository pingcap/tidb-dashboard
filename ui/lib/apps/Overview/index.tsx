import { Col, Row } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HashRouter as Router, Link } from 'react-router-dom'
import { RightOutlined } from '@ant-design/icons'

import { StatementsTable, useStatement } from '@lib/apps/Statement'
import client, { ClusterinfoClusterInfo } from '@lib/client'
import { DateTime, MetricChart, Root } from '@lib/components'

import SlowQueriesTable from '../SlowQuery/components/SlowQueriesTable'
import { defSlowQueryColumnKeys } from '../SlowQuery/pages/List'
import useSlowQuery, {
  DEF_SLOW_QUERY_OPTIONS,
} from '../SlowQuery/utils/useSlowQuery'
import MonitorAlertBar from './components/MonitorAlertBar'
import Nodes from './components/Nodes'

export default function App() {
  const { t } = useTranslation()
  const [cluster, setCluster] = useState<ClusterinfoClusterInfo | null>(null)
  const {
    orderOptions: stmtOrderOptions,
    changeOrder: changeStmtOrder,

    allTimeRanges,
    validTimeRange,
    loadingStatements,
    statements,
  } = useStatement(undefined, false)
  const {
    orderOptions,
    changeOrder,

    loadingSlowQueries,
    slowQueries,
    queryTimeRange,
  } = useSlowQuery({ ...DEF_SLOW_QUERY_OPTIONS, limit: 10 }, false)

  useEffect(() => {
    const fetchLoad = async () => {
      try {
        let res = await client.getInstance().topologyAllGet()
        setCluster(res.data)
      } catch (error) {
        setCluster(null)
      }
    }
    fetchLoad()
  }, [])

  return (
    <Root>
      <Router>
        <Row>
          <Col span={18}>
            <MetricChart
              title={t('overview.metrics.total_requests')}
              series={[
                {
                  query: 'sum(rate(tidb_server_query_total[1m])) by (result)',
                  name: 'Queries {result}',
                },
              ]}
              unit="ops"
              type="bar"
            />
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
            <StatementsTable
              key={`statement_${statements.length}`}
              visibleColumnKeys={{
                digest_text: true,
                sum_latency: true,
                avg_latency: true,
                related_schemas: true,
              }}
              visibleItemsCount={5}
              loading={loadingStatements}
              statements={statements}
              timeRange={validTimeRange}
              orderBy={stmtOrderOptions.orderBy}
              desc={stmtOrderOptions.desc}
              onChangeOrder={changeStmtOrder}
              title={
                <Link to="/statement">
                  {t('overview.top_statements.title')} <RightOutlined />
                </Link>
              }
              subTitle={
                allTimeRanges.length > 0 && (
                  <span>
                    <DateTime.Calendar
                      unixTimestampMs={(validTimeRange.begin_time ?? 0) * 1000}
                    />{' '}
                    ~{' '}
                    <DateTime.Calendar
                      unixTimestampMs={(validTimeRange.end_time ?? 0) * 1000}
                    />
                  </span>
                )
              }
            />
            <SlowQueriesTable
              key={`slow_query_${slowQueries.length}`}
              visibleColumnKeys={defSlowQueryColumnKeys}
              loading={loadingSlowQueries}
              slowQueries={slowQueries}
              orderBy={orderOptions.orderBy}
              desc={orderOptions.desc}
              onChangeOrder={changeOrder}
              title={
                <Link to="/slow_query">
                  {t('overview.recent_slow_query.title')} <RightOutlined />
                </Link>
              }
              subTitle={
                <span>
                  <DateTime.Calendar
                    unixTimestampMs={queryTimeRange.beginTime * 1000}
                  />{' '}
                  ~{' '}
                  <DateTime.Calendar
                    unixTimestampMs={queryTimeRange.endTime * 1000}
                  />
                </span>
              }
            />
          </Col>
          <Col span={6}>
            <Nodes />
            <MonitorAlertBar cluster={cluster} />
          </Col>
        </Row>
      </Router>
    </Root>
  )
}
