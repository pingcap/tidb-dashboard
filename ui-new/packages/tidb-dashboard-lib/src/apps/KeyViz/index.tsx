import React, { useContext } from 'react'
import { Routes, Route, HashRouter as Router } from 'react-router-dom'

import { Root } from '@lib/components'
import { addTranslations } from '@lib/utils/i18n'
import { useLocationChange } from '@lib/hooks/useLocationChange'

import KeyViz from './components/KeyViz'
import translations from './translations'
import { KeyVizContext } from './context'

addTranslations(translations)

function AppRoutes() {
  useLocationChange()

  return (
    <Routes>
      <Route path="/keyviz" element={<KeyViz />} />
    </Routes>
  )
}

export default () => {
  const ctx = useContext(KeyVizContext)
  if (ctx === null) {
    throw new Error('KeyVizContext must not be null')
  }

  return (
    <Root>
      <Router>
        <AppRoutes />
      </Router>
    </Root>
  )
}

export * from './context'
