import React from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { Root } from '@lib/components'
import { DiagnoseGenerator } from './pages'

const App = () => (
  <Root>
    <Router>
      <Routes>
        <Route path="/diagnose" element={<DiagnoseGenerator />} />
      </Routes>
    </Router>
  </Root>
)

export default App
