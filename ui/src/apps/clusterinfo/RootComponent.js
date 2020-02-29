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
    client.dashboard.topologyAllGet().then(data => {
      setCluster(data);
      setLoading(false);
    });
  }, []);

  if (loading === true || cluster === undefined) {
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
              <ComponentPanel name={'TIKV'} datas={cluster.data.tikv} />
            </Col>
            <Col span={8}>
              <ComponentPanel name={'TIDB'} datas={cluster.data.tidb} />
            </Col>
            <Col span={8}>
              <ComponentPanel name={'PD'} datas={cluster.data.pd} />
            </Col>
          </Row>

          <p> Nodes List </p>

          <ClusterInfoTable data={cluster.data} />
        </Col>
        <Col
          span={8}
          style={{
            padding: 20,
          }}
        >
          <MonitorAlertBar data={cluster.data} />
        </Col>
      </Row>
    </Router>
  );
};

export default App;
