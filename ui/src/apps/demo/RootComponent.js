import React from 'react';
import { Button } from 'antd';
import { Link } from 'react-router-dom';
import { HashRouter as Router } from 'react-router-dom';

import client from '@/utils/client';

const App = () => (
  <Router>
    <Button type="primary" onClick={handleClick}>Button</Button>
    <Link to="/home">
      <Button type="primary">Go To Home</Button>
    </Link>
  </Router>
);

async function handleClick() {
  const r = await client.dashboard.fooNameGet("abc");
  alert(r.data);
}

export default App;
