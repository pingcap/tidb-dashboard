import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'

import { Root } from '@lib/components'

import { NgmNotStartedGuard } from '../Ngm/components/Error/NgmNotStarted'
import { TopSQLList } from './pages/List/List'

export default function () {
  return (
    <Root>
      <Router>
        <Routes>
          <Route
            path="/topsql"
            element={
              <NgmNotStartedGuard>
                <TopSQLList />
              </NgmNotStartedGuard>
            }
          />
        </Routes>
      </Router>
    </Root>
  )
}
