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
  const [timeRange, setTimeRange] = useState({ begin_time: '', end_time: '' })
  const [topStatements, setTopStatements] = useState([])
  const [loadingStatements, setLoadingStatements] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    const fetchLoad = async () => {
      const res = await client.getInstance().topologyAllGet()
      setCluster(res.data)
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
                  <ComponentPanel field="tikv" data={cluster} />
                </Col>
                <Col span={8}>
                  <ComponentPanel field="tidb" data={cluster} />
                </Col>
                <Col span={8}>
                  <ComponentPanel field="pd" data={cluster} />
                </Col>
              </Row>
              <Card
                size="small"
                bordered={false}
                title={
                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <h3 style={{ marginRight: 8 }}>
                      {t('overview.top_statements.title')}
                    </h3>
                    <Link to="/statement">
                      {t('overview.top_statements.more')}
                      <RightOutlined />
                    </Link>
                  </div>
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
              <MonitorAlertBar cluster={cluster} />
            </Col>
          </Row>
        </Card>
      </div>
    </Router>
  )
}

export default App
