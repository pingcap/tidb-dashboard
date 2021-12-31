import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'

import { Root } from '@lib/components'
import { useNgmState, NgmState } from '@lib/utils/store'

import { TopSQLList } from './pages/List/List'
import { NgmNotStarted } from './pages/Error/NgmNotStarted'

export default function () {
  return (
    <Root>
      <Router>
        <Routes>
          <Route
            path="/topsql"
            element={
              useNgmState() === NgmState.Started ? (
                <TopSQLList />
              ) : (
                <NgmNotStarted />
              )
            }
          />
        </Routes>
      </Router>
    </Root>
  )
}
