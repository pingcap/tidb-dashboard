import React, { useContext } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'

import { Root } from '@lib/components'

import { NgmNotStartedGuard } from '../Ngm/components/Error/NgmNotStarted'
import { TopSQLList } from './pages/List/List'

import translations from './translations'
import { addTranslations } from '@lib/utils/i18n'
import { TopSQLContext } from './context'

addTranslations(translations)

export default function () {
  const ctx = useContext(TopSQLContext)
  if (ctx === null) {
    throw new Error('TopSQLContext must not be null')
  }

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

export * from './context'
