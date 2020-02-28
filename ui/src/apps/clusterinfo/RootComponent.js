import React from 'react';
import { Button } from 'antd';
import { HashRouter as Router } from 'react-router-dom';

import client from '@/utils/client';

const App = () => (
  <Router>
    <Button type="primary" onClick={loadClusterTopology}>Button</Button>
  </Router>
);


async function loadClusterTopology() {
  const r = await client.dashboard.topologyAllGet();
  alert(r.data);
}

export default App;
