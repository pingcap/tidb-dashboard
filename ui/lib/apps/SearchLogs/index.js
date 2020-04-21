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

const App = (props) => {
  return (
    <div>
      <Routes>
        <Route path="/search_logs/*" element={<LogSearching />} />
        <Route path="/search_logs/history" element={<LogSearchingHistory />} />
        <Route path="/search_logs/detail/:id" element={<DetailPageWrapper />} />
      </Routes>
    </div>
  )
}

export default function () {
  return (
    <Root>
      <Router>
        <App />
      </Router>
    </Root>
  )
}
