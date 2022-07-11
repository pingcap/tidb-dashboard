import React, { useContext } from 'react'
import { Root, ParamsPageWrapper } from '@lib/components'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { useLocationChange } from '@lib/hooks/useLocationChange'
import { addTranslations } from '@lib/utils/i18n'

import { LogSearch, LogSearchHistory, LogSearchDetail } from './pages'
import { SearchLogsContext } from './context'
import translations from './translations'

addTranslations(translations)

function AppRoutes() {
  useLocationChange()

  return (
    <Routes>
      <Route path="/search_logs" element={<LogSearch />} />
      <Route path="/search_logs/history" element={<LogSearchHistory />} />
      <Route
        path="/search_logs/detail"
        element={
          <ParamsPageWrapper>
            <LogSearchDetail />
          </ParamsPageWrapper>
        }
      />
    </Routes>
  )
}

export default function () {
  const ctx = useContext(SearchLogsContext)
  if (ctx === null) {
    throw new Error('SearchLogsContext must not be null')
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
