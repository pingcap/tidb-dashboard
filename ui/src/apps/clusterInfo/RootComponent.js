import React, { useState, useEffect } from 'react'
import { Row, Col, Card } from 'antd'
import { HashRouter as Router } from 'react-router-dom'

import client from '@/utils/client'

import { ClusterInfoTable, ComponentPanel, MonitorAlertBar } from './components'
import styles from './RootComponent.module.less'

const App = () => {
  const [cluster, setCluster] = useState(null)

  useEffect(() => {
    const fetchLoad = async () => {
      let res = await client.dashboard.topologyAllGet()
      const cluster = res.data
      setCluster(cluster)
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
              <ClusterInfoTable cluster={cluster} />
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
