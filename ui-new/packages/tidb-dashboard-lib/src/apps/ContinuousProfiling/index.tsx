import React, { useContext } from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { Root, ParamsPageWrapper } from '@lib/components'

import { NgmNotStartedGuard } from '../Ngm/components/Error/NgmNotStarted'
import { Detail, List } from './pages'

import translations from './translations'
import { addTranslations } from '@lib/utils/i18n'
import { ConProfilingContext } from './context'

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
