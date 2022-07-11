import React, { useContext } from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { Root, ParamsPageWrapper, NgmNotStartedGuard } from '@lib/components'
import { addTranslations } from '@lib/utils/i18n'

import { Detail, List } from './pages'
import { ConProfilingContext } from './context'
import translations from './translations'

addTranslations(translations)

const App = () => {
  const ctx = useContext(ConProfilingContext)
  if (ctx === null) {
    throw new Error('ConProfilingContext must not be null')
  }

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

export * from './context'
