import React from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { Root, ParamPageWrapper } from '@lib/components'
import { Detail, List } from './pages'

const App = () => (
  <Root>
    <Router>
      <Routes>
        <Route path="/instance_profiling" element={<List />} />
        <Route
          path="/instance_profiling/:id"
          element={
            <ParamPageWrapper>
              <Detail />
            </ParamPageWrapper>
          }
        />
      </Routes>
    </Router>
  </Root>
)

export default App
