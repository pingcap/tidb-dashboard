import React from 'react'
import { HashRouter as Router } from 'react-router-dom'
import StatementsOverviewPage from './StatementsOverviewPage'

const App = () => (
  <Router>
    <div style={{ margin: 12 }}>
      <StatementsOverviewPage />
    </div>
  </Router>
)

export default App
