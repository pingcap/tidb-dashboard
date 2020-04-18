import React from 'react'
import { Root } from '@lib/components'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { DiagnoseGenerator, DiagnoseStatus } from './components'

const App = () => (
  <Root>
    <Router>
      <Routes>
        <Route path="/diagnose/:id" element={<DiagnoseStatus />} />
        <Route path="/diagnose" element={<DiagnoseGenerator />} />
      </Routes>
    </Router>
  </Root>
)

export default App
