import React from 'react';
import { Button } from 'antd';
import './App.css';

import client from './utils/client';

const App = () => (
  <div className="App">
    <Button type="primary" onClick={handleClick}>Button</Button>
  </div>
);

async function handleClick() {
  const r = await client.dashboard.fooNameGet("abc");
  alert(r.data);
}

export default App;
