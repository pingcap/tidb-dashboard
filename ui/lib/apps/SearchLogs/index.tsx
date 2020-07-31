import React from 'react'
import { Root, ParamsPageWrapper } from '@lib/components'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { LogSearch, LogSearchHistory, LogSearchDetail } from './pages'

export default function () {
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
