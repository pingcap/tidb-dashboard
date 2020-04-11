import React from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import LogSearching from './LogSearching'
import LogSearchingDetail from './LogSearchingDetail'
import LogSearchingHistory from './LogSearchingHistory'

const App = (props) => {
  return (
    <div>
      <Routes>
        <Route path="/search_logs/*" element={<LogSearching />} />
        <Route path="/search_logs/history" element={<LogSearchingHistory />} />
        <Route
          path="/search_logs/detail/:id"
          element={<LogSearchingDetail />}
        />
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
