import React, { useContext } from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { Root, ParamsPageWrapper } from '@lib/components'
import { Detail, List } from './pages'

import translations from './translations'
import { addTranslations } from '@lib/utils/i18n'
import { InstanceProfilingContext } from './context'

addTranslations(translations)

const App = () => {
  const ctx = useContext(InstanceProfilingContext)
  if (ctx === null) {
    throw new Error('InstanceProfilingContext must not be null')
  }

  return (
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
}

export default App

export * from './context'
