import React from 'react'
import { Root } from '@lib/components'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import SlowQueryList from './SlowQueryList'
import SlowQueryDetail from './SlowQueryDetail'

export default function () {
  return (
    <Root>
      <Router>
        <Routes>
          <Route path="/slow_query" element={<SlowQueryList />} />
          <Route path="/slow_query/detail" element={<SlowQueryDetail />} />
        </Routes>
      </Router>
    </Root>
  )
}
