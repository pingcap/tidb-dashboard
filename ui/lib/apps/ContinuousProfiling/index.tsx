import React from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { Root, ParamsPageWrapper } from '@lib/components'

import { NgmNotStartedGuard } from '../Ngm/components/Error/NgmNotStarted'
import { Detail, List } from './pages'

const App = () => {
  return (
    <Root>
      <Router>
        <Routes>
          <Route
            path="/continuous_profiling"
            element={
              <NgmNotStartedGuard>
                <List />
              </NgmNotStartedGuard>
            }
          />
          <Route
            path="/continuous_profiling/detail"
            element={
              <NgmNotStartedGuard>
                <ParamsPageWrapper>
                  <Detail />
                </ParamsPageWrapper>
              </NgmNotStartedGuard>
            }
          />
        </Routes>
      </Router>
    </Root>
  )
}

export default App
