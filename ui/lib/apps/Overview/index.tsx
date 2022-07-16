import React from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import { Root } from '@lib/components'

import { List, Detail } from './pages'

export default function App() {
  return (
    <Root>
      <Router>
        <Routes>
          <Route path="/overview" element={<List />} />
          <Route path="/overview/detail" element={<Detail />} />
        </Routes>
      </Router>
    </Root>
  )
}
