import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'

import { Root } from '@lib/components'

import { TopSQLList } from './pages/List/List'

export default function () {
  return (
    <Root>
      <Router>
        <Routes>
          <Route path="/topsql" element={<TopSQLList />} />
        </Routes>
      </Router>
    </Root>
  )
}
