import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'

import { Root } from '@lib/components'
import { addTranslations } from '@lib/utils/i18n'
import { useLocationChange } from '@lib/hooks/useLocationChange'

import translations from './translations'
import { TopSlowQueryList } from './pages/List'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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
      <Route path="/top_slowquery" element={<TopSlowQueryList />} />
    </Routes>
  )
}

export default function () {
  return (
    // Provide the client to your App
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
