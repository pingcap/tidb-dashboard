import React, {useState, useEffect} from 'react';
import {Row, Col } from 'antd';
import {
  HashRouter as Router, Link,
} from 'react-router-dom';

import { ClusterInfo, ComponentPanel, MonitorAlertBar } from './components';

import client from '@/utils/client';


const App = () => {
  const [loading, setLoading] = useState(true);
  const [cluster, setCluster] = useState({});

  useEffect(() => {
    client.dashboard.topologyAllGet().then(
      data => {
        // console.log(data);
        setCluster(data);
        setLoading(false);
      }
    );

  }, []);

  if (loading === true || cluster === undefined) {
    return <p>Loading ...</p>;
  }

  console.log(cluster);
  return (
    <Router>
      <Row>
        <Col span={16}>
          <Row gutter={[8, 16]}>
            <Col span={8} >
              <ComponentPanel name={"tikv"} datas={cluster.data.tikv}/>
            </Col>
            <Col span={8} >
              <ComponentPanel name={"tidb"} datas={cluster.data.tidb}/>
            </Col>
            <Col span={8} >
              <ComponentPanel name={"pd"} datas={cluster.data.pd} />
            </Col>
          </Row>

          <p> Nodes List </p>

          <ClusterInfo data={cluster.data} />
        </Col>
        <Col span={8}>
          <MonitorAlertBar data={cluster.data} />
        </Col>
      </Row>
    </Router>
  );

}

async function fetchTopology() {
  const r = await client.dashboard.topologyAllGet();
  return r.data;
}

export default App;
