import React, { useContext } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'

import { Root } from '@lib/components'
import { addTranslations } from '@lib/utils/i18n'

import translations from './translations'
import { OverviewContext } from './context'
import { useLocationChange } from '@lib/hooks/useLocationChange'
import { List, Detail } from './pages'

addTranslations(translations)

function AppRoutes() {
  useLocationChange()
  return (
    <Routes>
      <Route path="/overview" element={<List />} />
      <Route path="/overview/detail" element={<Detail />} />
    </Routes>
  )
}

export default function () {
  const ctx = useContext(OverviewContext)
  if (ctx === null) {
    throw new Error('OverviewContext must not be null')
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
