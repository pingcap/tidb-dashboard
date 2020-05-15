import React from 'react'
import { Root } from '@lib/components'
import {
  HashRouter as Router,
  Route,
  Routes,
  useParams,
} from 'react-router-dom'

import { LogSearch, LogSearchHistory, LogSearchDetail } from './pages'

function DetailPageWrapper() {
  const { id } = useParams()

  return <LogSearchDetail key={id} />
}

export default function () {
  return (
    <Root>
      <Router>
        <Routes>
          <Route path="/search_logs" element={<LogSearch />} />
          <Route path="/search_logs/history" element={<LogSearchHistory />} />
          <Route
            path="/search_logs/detail/:id"
            element={<DetailPageWrapper />}
          />
        </Routes>
      </Router>
    </Root>
  )
}
