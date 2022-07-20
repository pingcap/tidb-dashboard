import React, { useContext } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'

import { Root } from '@lib/components'
import useCache, { CacheContext } from '@lib/utils/useCache'
import { addTranslations } from '@lib/utils/i18n'

import { Detail, List } from './pages'
import { StatementContext } from './context'

import translations from './translations'
import { useLocationChange } from '@lib/hooks/useLocationChange'

addTranslations(translations)

function AppRoutes() {
  useLocationChange()

  return (
    <Routes>
      <Route path="/statement" element={<List />} />
      <Route path="/statement/detail" element={<Detail />} />
    </Routes>
  )
}

export default function () {
  const statementCacheMgr = useCache(2)

  const ctx = useContext(StatementContext)
  if (ctx === null) {
    throw new Error('StatementContext must not be null')
  }

  return (
    <Root>
      <CacheContext.Provider value={statementCacheMgr}>
        <Router>
          <AppRoutes />
        </Router>
      </CacheContext.Provider>
    </Root>
  )
}

export * from './context'
