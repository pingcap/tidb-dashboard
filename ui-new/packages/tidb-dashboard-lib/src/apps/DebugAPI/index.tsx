import React, { useContext } from 'react'
import { Routes, Route, HashRouter as Router } from 'react-router-dom'

import { Root } from '@lib/components'
import { addTranslations } from '@lib/utils/i18n'
import { useLocationChange } from '@lib/hooks/useLocationChange'

import { DebugAPIContext } from './context'
import { ApiList } from './apilist'
import translations from './translations'

addTranslations(translations)

function AppRoutes() {
  useLocationChange()

  return (
    <Routes>
      <Route path="/debug_api" element={<ApiList />} />
    </Routes>
  )
}

export default function () {
  const ctx = useContext(DebugAPIContext)
  if (ctx === null) {
    throw new Error('DebugAPIContext must not be null')
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
