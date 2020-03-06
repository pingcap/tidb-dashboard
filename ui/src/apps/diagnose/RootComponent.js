import React from 'react'
import { HashRouter as Router, Switch, Route } from 'react-router-dom'
import { DiagnoseGenerator, DiagnoseStatus } from './components'
import client from '@/utils/client'

function createReport(startTime, endTime, compareStartTime, compareEndTime) {
  return client.dashboard
    .diagnoseReportsPost(startTime, endTime, compareStartTime, compareEndTime)
    .then(res => res.data)
}

function fetchReport(reportId) {
  return client.dashboard
    .diagnoseReportsIdStatusGet(reportId)
    .then(res => res.data)
}

const App = () => (
  <Router>
    <div style={{ margin: 12 }}>
      <Switch>
        <Route path="/diagnose/:id">
          <DiagnoseStatus
            basePath={client.basePath}
            fetchReport={fetchReport}
          />
        </Route>
        <Route path="/diagnose">
          <DiagnoseGenerator createReport={createReport} />
        </Route>
      </Switch>
    </div>
  </Router>
)

export default App
