import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'

import { Root } from '@lib/components'

import { Home } from './pages'

export default function () {
  return (
    <Root>
      <Router>
        <Routes>
          <Route path="/__APP_NAME__" element={<Home />} />
        </Routes>
      </Router>
    </Root>
  )
}
