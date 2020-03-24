import React from 'react'
import { HashRouter as Router, Route, Switch, withRouter } from 'react-router-dom'
import LogSearching from './LogSearching'
import LogSearchingDetail from './LogSearchingDetail'
import LogSearchingHistory from './LogSearchingHistory'

const App = withRouter(props => {

  return (
    <div>
      <Switch>
        <Route exact path="/search_logs">
          <LogSearching />
        </Route>
        <Route path="/search_logs/history">
          <LogSearchingHistory />
        </Route>
        <Route path="/search_logs/detail/:id">
          <LogSearchingDetail />
        </Route>
      </Switch>
    </div>
  )
})

export default function () {
  return (
    <Router>
      <App />
    </Router>
  )
}
