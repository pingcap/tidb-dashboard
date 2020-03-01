import React, { useState, useEffect } from 'react'
import { Row, Col, Spin, Icon } from 'antd'
import { HashRouter as Router } from 'react-router-dom'

import client from '@/utils/client'

import { ClusterInfoTable, ComponentPanel, MonitorAlertBar } from './components'

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
      <Row
        style={{
          background: '#fff',
          padding: 24,
          margin: 24,
          minHeight: 700
        }}
      >
        <Col span={18}>
          <Row gutter={[8, 16]}>
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
    </Router>
  )
}

export default App
