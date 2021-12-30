import React from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { ParamsPageWrapper, Root } from '@lib/components'
import { ReportGenerator, ReportStatus } from './pages'

const App = () => (
  <Root>
    <Router>
      <Routes>
        <Route path="/system_report" element={<ReportGenerator />} />
        <Route
          path="/system_report/detail"
          element={
            <ParamsPageWrapper>
              <ReportStatus />
            </ParamsPageWrapper>
          }
        />
      </Routes>
    </Router>
  </Root>
)

export default App
