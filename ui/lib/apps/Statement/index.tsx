import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'

import { Root } from '@lib/components'
import { StatementsOverview } from './components'
import { Detail } from './pages'

export default function () {
  return (
    <Root>
      <Router>
        <Routes>
          <Route path="/statement" element={<StatementsOverview />} />
          <Route path="/statement/detail" element={<Detail />} />
        </Routes>
      </Router>
    </Root>
  )
}

export * from './components'
export * from './pages'
