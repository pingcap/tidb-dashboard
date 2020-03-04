import React, { useState, useEffect } from 'react'
import { Row, Col, Spin, Icon, Card } from 'antd'
import { HashRouter as Router } from 'react-router-dom'

import client from '@/utils/client'

import { ClusterInfoTable, ComponentPanel, MonitorAlertBar } from './components'
import styles from './RootComponent.module.less'

const App = () => {
  const [loading, setLoading] = useState(true)
  const [cluster, setCluster] = useState({})

  useEffect(() => {
    const fetchLoad = async () => {
      let res = await client.dashboard.topologyAllGet()
      const cluster = res.data
      setCluster(cluster)
      setLoading(false)
    }
    fetchLoad()
  }, [])

  if (loading) {
    return (
      <Spin indicator={<Icon type="loading" style={{ fontSize: 24 }} spin />} />
    )
  }

  return (
    <Router>
      <div style={{ padding: 24 }}>
        <Card bordered={false} className={styles.cardContainer}>
          <Row gutter={24}>
            <Col span={18}>
              <Row gutter={24}>
                <Col span={8}>
                  <ComponentPanel name={'TIKV'} datas={cluster.tikv} />
                </Col>
                <Col span={8}>
                  <ComponentPanel name={'TIDB'} datas={cluster.tidb} />
                </Col>
                <Col span={8}>
                  <ComponentPanel name={'PD'} datas={cluster.pd} />
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
