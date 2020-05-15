import React from 'react'
import { Root } from '@lib/components'
import {
  HashRouter as Router,
  Route,
  Routes,
  useParams,
} from 'react-router-dom'
import LogSearching from './LogSearching'
import LogSearchingDetail from './LogSearchingDetail'
import LogSearchingHistory from './LogSearchingHistory'

function DetailPageWrapper() {
  const { id } = useParams()

  return <LogSearchingDetail key={id} />
}

export default function () {
  return (
    <Root>
      <Router>
        <Routes>
          <Route path="/search_logs" element={<LogSearching />} />
          <Route
            path="/search_logs/history"
            element={<LogSearchingHistory />}
          />
          <Route
            path="/search_logs/detail/:id"
            element={<DetailPageWrapper />}
          />
        </Routes>
      </Router>
    </Root>
  )
}
