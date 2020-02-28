import React, { useState, useEffect } from 'react';
import { Row, Col } from 'antd';
import { HashRouter as Router } from 'react-router-dom';

import { Component_panel, ComponentPanel, MonitorAlertBar } from './components';

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
      <Row>
        <Col span={16}>
          <Row gutter={[8, 16]}>
            <Col span={8}>
              <ComponentPanel name={'tikv'} datas={cluster.data.tikv} />
            </Col>
            <Col span={8}>
              <ComponentPanel name={'tidb'} datas={cluster.data.tidb} />
            </Col>
            <Col span={8}>
              <ComponentPanel name={'pd'} datas={cluster.data.pd} />
            </Col>
          </Row>

          <p> Nodes List </p>

          <Component_panel data={cluster.data} />
        </Col>
        <Col span={8}>
          <MonitorAlertBar data={cluster.data} />
        </Col>
      </Row>
    </Router>
  );
};

export default App;
