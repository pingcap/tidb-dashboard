import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'

import { Root } from '@lib/components'
import { List, Detail } from './pages'

export default function () {
  return (
    <Root>
      <Router>
        <Routes>
          <Route path="/statement" element={<List />} />
          <Route path="/statement/detail" element={<Detail />} />
        </Routes>
      </Router>
    </Root>
  )
}

export * from './components'
export * from './pages'
export * from './utils/useStatementTableController'
export { default as useStatementTableController } from './utils/useStatementTableController'
