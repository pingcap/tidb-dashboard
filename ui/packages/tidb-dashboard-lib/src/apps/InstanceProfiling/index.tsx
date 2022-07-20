import React, { useContext } from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { useLocationChange } from '@lib/hooks/useLocationChange'
import { Root, ParamsPageWrapper } from '@lib/components'
import { addTranslations } from '@lib/utils/i18n'

import { Detail, List } from './pages'
import translations from './translations'
import { InstanceProfilingContext } from './context'

addTranslations(translations)

function AppRoutes() {
  useLocationChange()

  return (
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
  )
}

const App = () => {
  const ctx = useContext(InstanceProfilingContext)
  if (ctx === null) {
    throw new Error('InstanceProfilingContext must not be null')
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
