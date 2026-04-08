import React, { useContext } from 'react'
import { Root } from '@lib/components'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useLocationChange } from '@lib/hooks/useLocationChange'
import { addTranslations } from '@lib/utils/i18n'

import { RefreshHistory, RefreshHistoryDetail } from './pages'
import { MaterializedViewContext } from './context'
import translations from './translations'

addTranslations(translations)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})

function AppRoutes() {
  useLocationChange()

  return (
    <Routes>
      <Route path="/materialized_view" element={<RefreshHistory />} />
      <Route
        path="/materialized_view/detail/:id"
        element={<RefreshHistoryDetail />}
      />
    </Routes>
  )
}

export default function () {
  const context = useContext(MaterializedViewContext)
  if (context === null) {
    throw new Error('MaterializedViewContext must not be null')
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
