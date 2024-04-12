import React, { useContext } from 'react'
import { Root } from '@lib/components'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import useCache, { CacheContext } from '@lib/utils/useCache'

import { addTranslations } from '@lib/utils/i18n'

import { List, Detail } from './pages'

import { SlowQueryContext } from './context'

import translations from './translations'
import { useLocationChange } from '@lib/hooks/useLocationChange'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

addTranslations(translations)

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false
      // refetchOnMount: false,
      // refetchOnReconnect: false,
      // retry: false
    }
  }
})

function AppRoutes() {
  useLocationChange()

  return (
    <Routes>
      <Route path="/slow_query" element={<List />} />
      <Route path="/slow_query/detail" element={<Detail />} />
    </Routes>
  )
}

export default function () {
  const slowQueryCacheMgr = useCache(2)

  const context = useContext(SlowQueryContext)
  if (context === null) {
    throw new Error('SlowQueryContext must not be null')
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Root>
        <CacheContext.Provider value={slowQueryCacheMgr}>
          <Router>
            <AppRoutes />
          </Router>
        </CacheContext.Provider>
      </Root>
    </QueryClientProvider>
  )
}

export * from './context'
