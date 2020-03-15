import React from 'react'
import { HashRouter as Router } from 'react-router-dom'
import { StatementsOverviewPage } from '@pingcap-incubator/statement'
import client from '@/utils/client'

const App = () => (
  <Router>
    <div style={{ margin: 12 }}>
      <StatementsOverviewPage
        dashboardClient={client.dashboard}
        detailPagePath="/statement/detail"
      />
    </div>
  </Router>
)

export default App
