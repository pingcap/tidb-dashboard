import React from 'react'
import { Root } from '@lib/components'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import SlowQueryList from './SlowQueryList'
import SlowQueryDetail from './SlowQueryDetail'

const App = (props) => {
  return (
    <div>
      <Routes>
        <Route path="/slow_query" element={<SlowQueryList />} />
        <Route path="/slow_query/detail" element={<SlowQueryDetail />} />
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
