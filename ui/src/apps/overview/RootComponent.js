import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Skeleton } from 'antd'
import { RightOutlined } from '@ant-design/icons'
import { HashRouter as Router, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import client from '@pingcap-incubator/dashboard_client'
import { StatementsTable } from '@pingcap-incubator/statement'

import { ComponentPanel, MonitorAlertBar } from './components'
import styles from './RootComponent.module.less'

const App = () => {
  const [cluster, setCluster] = useState(null)
  const [clusterError, setClusterError] = useState(null)
  const [timeRange, setTimeRange] = useState({ begin_time: '', end_time: '' })
  const [topStatements, setTopStatements] = useState([])
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

    const fetchTopStatements = async () => {
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
        setTopStatements((res.data || []).slice(0, 5))
      }
      setLoadingStatements(false)
    }

    fetchLoad()
    fetchTopStatements()
  }, [])

  return (
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
              <Card
                size="small"
                bordered={false}
                extra={
                  <Link to="/statement">
                    {t('overview.top_statements.more')}
                    <RightOutlined />
                  </Link>
                }
                title={
                  timeRange.begin_time.length > 0
                    ? `${t('overview.top_statements.title')} (${
                        timeRange.begin_time
                      } ~ ${timeRange.end_time})`
                    : t('overview.top_statements.title')
                }
              >
                {loadingStatements ? (
                  <Skeleton active />
                ) : (
                  <StatementsTable
                    statements={topStatements}
                    loading={false}
                    timeRange={timeRange}
                    concise={true}
                  />
                )}
              </Card>
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
  )
}

export default App
