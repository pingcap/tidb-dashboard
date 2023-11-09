import React, { useContext } from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { Root, ParamsPageWrapper, NgmNotStartedGuard } from '@lib/components'
import { addTranslations } from '@lib/utils/i18n'

import { Detail, List } from './pages'
import { ConProfilingContext } from './context'
import translations from './translations'
import { useLocationChange } from '@lib/hooks/useLocationChange'

addTranslations(translations)

function AppRoutes() {
  useLocationChange()
  const ctx = useContext(ConProfilingContext)
  const checkNgm = ctx?.cfg.checkNgm ?? true

  return (
    <Routes>
      <Route
        path="/continuous_profiling"
        element={
          checkNgm ? (
            <NgmNotStartedGuard>
              <List />
            </NgmNotStartedGuard>
          ) : (
            <List />
          )
        }
      />
      <Route
        path="/continuous_profiling/detail"
        element={
          checkNgm ? (
            <NgmNotStartedGuard>
              <ParamsPageWrapper>
                <Detail />
              </ParamsPageWrapper>
            </NgmNotStartedGuard>
          ) : (
            <ParamsPageWrapper>
              <Detail />
            </ParamsPageWrapper>
          )
        }
      />
    </Routes>
  )
}

const App = () => {
  const ctx = useContext(ConProfilingContext)
  if (ctx === null) {
    throw new Error('ConProfilingContext must not be null')
  }

  return (
    <Root>
      <Router>
        <AppRoutes />
      </Router>
    </Root>
  )
}

export default App

export * from './context'
