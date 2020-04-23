import React, { useState, useEffect } from 'react'
import { Root, DateTime, MetricChart } from '@lib/components'
import { Row, Col } from 'antd'
import { RightOutlined } from '@ant-design/icons'
import { HashRouter as Router, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import client, {
  ClusterinfoClusterInfo,
  StatementTimeRange,
  StatementModel,
} from '@lib/client'
import { StatementsTable } from '@lib/apps/Statement'
import MonitorAlertBar from './components/MonitorAlertBar'
import styles from './index.module.less'
import Nodes from './components/Nodes'

export default function App() {
  const [cluster, setCluster] = useState<ClusterinfoClusterInfo | null>(null)
  const [timeRange, setTimeRange] = useState<StatementTimeRange>({
    begin_time: 0,
    end_time: 0,
  })
  const [statements, setStatements] = useState<StatementModel[]>([])
  const [loadingStatements, setLoadingStatements] = useState(false)

  const { t } = useTranslation()

  useEffect(() => {
    const fetchLoad = async () => {
      try {
        let res = await client.getInstance().topologyAllGet()
        setCluster(res.data)
      } catch (error) {
        setCluster(null)
      }
    }

    const fetchStatements = async () => {
      setLoadingStatements(true)
      const rRes = await client.getInstance().statementsTimeRangesGet()
      const timeRanges = rRes.data || []
      if (timeRanges.length > 0) {
        setTimeRange(timeRanges[0])
        const res = await client
          .getInstance()
          .statementsOverviewsGet(
            timeRanges[0].begin_time!,
            timeRanges[0].end_time!
          )
        setStatements(res.data || [])
      }
      setLoadingStatements(false)
    }

    fetchLoad()
    fetchStatements()
  }, [])

  return (
    <Root>
      <Router>
        <Row gutter={24}>
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
              className={styles.statementsTable}
              key={statements.length}
              statements={statements}
              visibleColumnKeys={{
                digest_text: true,
                sum_latency: true,
                avg_latency: true,
                related_schemas: true,
              }}
              visibleItemsCount={5}
              loading={loadingStatements}
              timeRange={timeRange}
              title={
                <Link to="/statement">
                  {t('overview.top_statements.title')} <RightOutlined />
                </Link>
              }
              subTitle={
                timeRange.begin_time && (
                  <span>
                    <DateTime.Calendar
                      unixTimestampMs={timeRange.begin_time * 1000}
                    />{' '}
                    ~{' '}
                    <DateTime.Calendar
                      unixTimestampMs={(timeRange.end_time ?? 0) * 1000}
                    />
                  </span>
                )
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
