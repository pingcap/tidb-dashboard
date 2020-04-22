import React, { useState, useEffect } from 'react'
import { Root, DateTime } from '@lib/components'
import { Row, Col, Card } from 'antd'
import { RightOutlined } from '@ant-design/icons'
import { HashRouter as Router, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'

import client from '@lib/client'
import { StatementsTable } from '@lib/apps/Statement'

import { ComponentPanel, MonitorAlertBar } from './components'
import styles from './index.module.less'

const App = () => {
  const [cluster, setCluster] = useState(null)
  const [clusterError, setClusterError] = useState(null)
  const [timeRange, setTimeRange] = useState({ begin_time: 0, end_time: 0 })
  const [statements, setStatements] = useState([])
  const [loadingStatements, setLoadingStatements] = useState(false)

  const { t } = useTranslation()

  useEffect(() => {
    const fetchLoad = async () => {
      try {
        let res = await client.getInstance().topologyAllGet()
        const cluster = res.data
        setCluster(cluster)
        setClusterError(null)
      } catch (error) {
        let topology_error
        if (error.response) {
          topology_error = error.response.data
        } else if (error.request) {
          topology_error = error.request
        } else {
          topology_error = error.message
        }
        setCluster(null)
        setClusterError(topology_error)
      }
    }

    const fetchStatements = async () => {
      setLoadingStatements(true)
      let res = await client.getInstance().statementsTimeRangesGet()
      const timeRanges = res.data || []
      if (timeRanges.length > 0) {
        setTimeRange(timeRanges[0])
        res = await client
          .getInstance()
          .statementsOverviewsGet(
            timeRanges[0].begin_time,
            timeRanges[0].end_time
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
        <div style={{ padding: 24 }}>
          <Card bordered={false} className={styles.cardContainer}>
            <Row gutter={24}>
              <Col span={18}>
                <Row gutter={24}>
                  <Col span={8}>
                    <ComponentPanel
                      field="tikv"
                      data={cluster}
                      clusterError={clusterError}
                    />
                  </Col>
                  <Col span={8}>
                    <ComponentPanel
                      field="tidb"
                      data={cluster}
                      clusterError={clusterError}
                    />
                  </Col>
                  <Col span={8}>
                    <ComponentPanel
                      field="pd"
                      data={cluster}
                      clusterError={clusterError}
                    />
                  </Col>
                </Row>
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
                  title={t('overview.top_statements.title')}
                  subTitle={
                    timeRange.begin_time > 0 && (
                      <span>
                        <DateTime.Calendar
                          unixTimestampMs={timeRange.begin_time * 1000}
                        />{' '}
                        ~{' '}
                        <DateTime.Calendar
                          unixTimestampMs={timeRange.end_time * 1000}
                        />
                      </span>
                    )
                  }
                  cardExtra={
                    <Link to="/statement">
                      {t('overview.top_statements.more')}
                      <RightOutlined />
                    </Link>
                  }
                />
              </Col>
              <Col span={6}>
                {cluster ? (
                  <MonitorAlertBar
                    cluster={cluster}
                    clusterError={clusterError}
                  />
                ) : (
                  <MonitorAlertBar
                    cluster={cluster}
                    clusterError={clusterError}
                  />
                )}
              </Col>
            </Row>
          </Card>
        </div>
      </Router>
    </Root>
  )
}

export default App
