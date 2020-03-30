import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { DiagnoseGenerator, DiagnoseStatus } from './components'

const App = () => (
  <Router>
    <Routes>
      <Route path="/diagnose/:id">
        <DiagnoseStatus />
      </Route>
      <Route path="/diagnose">
        <DiagnoseGenerator />
      </Route>
    </Routes>
  </Router>
)

export default App
