import React from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import LogSearching from './LogSearching'
import LogSearchingDetail from './LogSearchingDetail'
import LogSearchingHistory from './LogSearchingHistory'

const App = (props) => {
  return (
    <div>
      <Routes>
        <Route exact path="/search_logs">
          <LogSearching />
        </Route>
        <Route path="/search_logs/history">
          <LogSearchingHistory />
        </Route>
        <Route path="/search_logs/detail/:id">
          <LogSearchingDetail />
        </Route>
      </Routes>
    </div>
  )
}

export default function () {
  return (
    <Router>
      <App />
    </Router>
  )
}
