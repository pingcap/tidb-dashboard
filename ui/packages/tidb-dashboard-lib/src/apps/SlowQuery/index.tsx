import React, { useContext } from 'react'
import { Root } from '@lib/components'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useLocationChange } from '@lib/hooks/useLocationChange'
import { addTranslations } from '@lib/utils/i18n'

import { List, Detail } from './pages'
import { SlowQueryContext } from './context'
import translations from './translations'

addTranslations(translations)

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
      // refetchOnMount: false,
      // refetchOnReconnect: false,
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
  const context = useContext(SlowQueryContext)
  if (context === null) {
    throw new Error('SlowQueryContext must not be null')
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Root>
        <Router>
          <AppRoutes />
        </Router>
      </Root>
    </QueryClientProvider>
  )
}

export * from './context'
