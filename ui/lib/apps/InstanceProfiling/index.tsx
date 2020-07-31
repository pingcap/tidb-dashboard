import React from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { Root, ParamsPageWrapper } from '@lib/components'
import { Detail, List } from './pages'

const App = () => (
  <Root>
    <Router>
      <Routes>
        <Route path="/instance_profiling" element={<List />} />
        <Route
          path="/instance_profiling/detail"
          element={
            <ParamsPageWrapper>
              <Detail />
            </ParamsPageWrapper>
          }
        />
      </Routes>
    </Router>
  </Root>
)

export default App
