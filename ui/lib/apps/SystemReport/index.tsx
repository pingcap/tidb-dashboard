import React from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { ParamsPageWrapper, Root } from '@lib/components'
import { DiagnoseGenerator, DiagnoseStatus } from './pages'

const App = () => (
  <Root>
    <Router>
      <Routes>
        <Route path="/diagnose" element={<DiagnoseGenerator />} />
        <Route
          path="/diagnose/:id"
          element={
            <ParamsPageWrapper>
              <DiagnoseStatus />
            </ParamsPageWrapper>
          }
        />
      </Routes>
    </Router>
  </Root>
)

export default App
