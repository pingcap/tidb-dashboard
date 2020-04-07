import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Skeleton } from 'antd'
import { HashRouter as Router } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import client from '@pingcap-incubator/dashboard_client'

import { ComponentPanel, MonitorAlertBar } from './components'
import styles from './RootComponent.module.less'

const App = () => {
  const [cluster, setCluster] = useState(null)
  const [clusterError, setClusterError] = useState(null)

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
                <Skeleton active />
              </Card>
            </Col>
            <Col span={6}>
              {cluster ? (
                <MonitorAlertBar cluster={cluster} />
              ) : (
                <MonitorAlertBar cluster={{ error: clusterError }} />
              )}
            </Col>
          </Row>
        </Card>
      </div>
    </Router>
  )
}

export default App
