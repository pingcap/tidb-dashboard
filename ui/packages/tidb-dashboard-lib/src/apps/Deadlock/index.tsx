import React, { useContext } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'

import { Root } from '@lib/components'
import useCache, { CacheContext } from '@lib/utils/useCache'
import { useLocationChange } from '@lib/hooks/useLocationChange'
import { addTranslations } from '@lib/utils/i18n'

import { List, Detail } from './pages'
import { DeadlockContext } from './context'
import translations from './translations'

addTranslations(translations)

function AppRoutes() {
  useLocationChange()

  return (
    <Routes>
      <Route path="/deadlock" element={<List />} />
      <Route path="/deadlock/detail" element={<Detail />} />
    </Routes>
  )
}

export default function () {
  const cache = useCache(32)

  const ctx = useContext(DeadlockContext)
  if (ctx === null) {
    throw new Error('DeadlockContext must not be null')
  }

  return (
    <Root>
      <CacheContext.Provider value={cache}>
        <Router>
          <AppRoutes />
        </Router>
      </CacheContext.Provider>
    </Root>
  )
}

export * from './context'
