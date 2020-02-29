import React, { useState, useEffect } from 'react';
import { Row, Col } from 'antd';
import { HashRouter as Router } from 'react-router-dom';

import {
  ClusterInfoTable,
  ComponentPanel,
  MonitorAlertBar,
} from './components';

import client from '@/utils/client';

const App = () => {
  const [loading, setLoading] = useState(true);
  const [cluster, setCluster] = useState({});

  useEffect(() => {
    client.dashboard
      .topologyAllGet()
      .then(res => res.data)
      .then(cluster => {
        setCluster(cluster);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Loading ...</p>;
  }

  return (
    <Router>
      <Row
        style={{
          background: '#fff',
          padding: 24,
          margin: 24,
          minHeight: 700,
        }}
      >
        <Col span={16}>
          <Row gutter={[8, 16]}>
            <Col span={8}>
              {/* TODO: datas is too general, it is not a good name, make it specific */}
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
        <Col
          span={8}
          style={{
            padding: 20,
          }}
        >
          <MonitorAlertBar cluster={cluster} />
        </Col>
      </Row>
    </Router>
  );
};

export default App;
