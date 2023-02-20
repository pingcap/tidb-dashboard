import React, { useContext } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'

import { Root } from '@lib/components'
import { addTranslations } from '@lib/utils/i18n'

import { List, Detail } from './pages'
import { SQLAdvisorContext } from './context'

import translations from './translations'
import { useLocationChange } from '@lib/hooks/useLocationChange'

addTranslations(translations)

function AppRoutes() {
  useLocationChange()

  return (
    <Routes>
      <Route path="/sql_advisor" element={<List />} />
      <Route path="/sql_advisor/detail" element={<Detail />} />
    </Routes>
  )
}

export default function () {
  const ctx = useContext(SQLAdvisorContext)

  if (ctx === null) {
    throw new Error('SQLAdvisorContext must not be null')
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
