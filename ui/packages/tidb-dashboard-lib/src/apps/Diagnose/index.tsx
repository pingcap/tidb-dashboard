import React, { useContext } from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { Root } from '@lib/components'
import { useLocationChange } from '@lib/hooks/useLocationChange'
import { addTranslations } from '@lib/utils/i18n'

import { DiagnoseContext } from './context'
import { DiagnoseGenerator } from './pages'
import translations from './translations'

addTranslations(translations)

function AppRoutes() {
  useLocationChange()

  return (
    <Routes>
      <Route path="/diagnose" element={<DiagnoseGenerator />} />
    </Routes>
  )
}

const App = () => {
  const ctx = useContext(DiagnoseContext)
  if (ctx === null) {
    throw new Error('DiagnoseContext must not be null')
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
