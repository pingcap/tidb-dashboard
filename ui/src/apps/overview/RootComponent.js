import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Skeleton } from 'antd'
import { HashRouter as Router } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import client from '@pingcap-incubator/dashboard_client'

import { ComponentPanel, MonitorAlertBar } from './components'
import styles from './RootComponent.module.less'
import { StatementsTable } from '@pingcap-incubator/statement'

const App = () => {
  const [cluster, setCluster] = useState(null)
  const [topStatements, setTopStatements] = useState([])
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    const fetchLoad = async () => {
      setLoading(true)
      let res = await client.getInstance().topologyAllGet()
      setCluster(res.data)
      res = await client.getInstance().statementsRecentTopsGet()
      setTopStatements(res.data)
      setLoading(false)
    }
    fetchLoad()
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
                title={t('overview.top_statements.title')}
              >
                {loading ? (
                  <Skeleton active />
                ) : (
                  <StatementsTable
                    statements={topStatements}
                    loading={false}
                    timeRange={{ begin_time: '', end_time: '' }}
                    detailPagePath={'/statement/detail'}
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
