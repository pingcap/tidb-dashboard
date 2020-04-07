import React from 'react'
import { HashRouter as Router } from 'react-router-dom'
import { StatementsOverviewPage } from '@pingcap-incubator/statement'
import client from '@pingcap-incubator/dashboard_client'

const App = () => (
  <Router>
    <div style={{ margin: 12 }}>
      <StatementsOverviewPage
        dashboardClient={client.getInstance()}
        detailPagePath="/statement/detail"
      />
    </div>
  </Router>
)

export default App
