import React, { useContext } from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { Root } from '@lib/components'
import { DiagnoseGenerator } from './pages'

import { addTranslations } from '@lib/utils/i18n'
import translations from './translations'
import { DiagnoseContext } from './context'

addTranslations(translations)

const App = () => {
  const ctx = useContext(DiagnoseContext)
  if (ctx === null) {
    throw new Error('DiagnoseContext must not be null')
  }

  return (
    <Root>
      <Router>
        <Routes>
          <Route path="/diagnose" element={<DiagnoseGenerator />} />
        </Routes>
      </Router>
    </Root>
  )
}

export default App

export * from './context'
