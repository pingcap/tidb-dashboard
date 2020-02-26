import React from 'react';
import { Button } from 'antd';
import { Link } from 'react-router-dom';
import { HashRouter as Router } from 'react-router-dom';

import client from '@/utils/client';

const App = () => (
  <Router>
    <Link to="/home">
      <Button type="primary">Go To Home</Button>
    </Link>
    <Button type="primary" onClick={handleClick}>
      Button
    </Button>
    <Button type="primary">
      <a
        href="http://127.0.0.1:12333/dashboard/api/foo/sql-diagnosis"
        target="_blank"
      >
        SQL Diagnosis Report
      </a>
    </Button>
  </Router>
);

async function handleClick() {
  const r = await client.dashboard.fooBarNameGet('abc');
  alert(r.data);
}

export default App;
