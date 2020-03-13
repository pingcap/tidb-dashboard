import React from 'react'
import { HashRouter as Router } from 'react-router-dom'
import ExampleComponent from '@pingcap-incubator/statement'

const App = () => (
  <Router>
    <div style={{ margin: 12 }}>
      <ExampleComponent text="dashboard" />
    </div>
  </Router>
)

export default App
