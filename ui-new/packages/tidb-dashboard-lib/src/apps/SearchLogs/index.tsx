import React, { useContext } from 'react'
import { Root, ParamsPageWrapper } from '@lib/components'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { LogSearch, LogSearchHistory, LogSearchDetail } from './pages'

import translations from './translations'
import { addTranslations } from '@lib/utils/i18n'
import { SearchLogsContext } from './context'

addTranslations(translations)

export default function () {
  const ctx = useContext(SearchLogsContext)
  if (ctx === null) {
    throw new Error('SearchLogsContext must not be null')
  }

  return (
    <Root>
      <Router>
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
      </Router>
    </Root>
  )
}

export * from './context'
