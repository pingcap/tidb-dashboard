import React from 'react'
import { Root } from '@lib/components'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import { List, Detail } from './pages'
import useSlowQuery from './utils/useSlowQuery'

export default function () {
  return (
    <Root>
      <Router>
        <Routes>
          <Route path="/slow_query" element={<List />} />
          <Route path="/slow_query/detail" element={<Detail />} />
        </Routes>
      </Router>
    </Root>
  )
}

export * from './components'
export * from './pages'
export { useSlowQuery }
