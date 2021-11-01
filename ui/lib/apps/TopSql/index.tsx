import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from 'react-query'

import { Root } from '@lib/components'

import { TopSQL } from './pages/TopSql'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})

export default function () {
  return (
    <QueryClientProvider client={queryClient}>
      <Root>
        <Router>
          <Routes>
            <Route path="/top_sql" element={<TopSQL />} />
          </Routes>
        </Router>
      </Root>
    </QueryClientProvider>
  )
}
