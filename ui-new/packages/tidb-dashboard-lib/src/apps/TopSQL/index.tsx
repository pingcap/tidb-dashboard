import React, { useContext } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'

import { Root, NgmNotStartedGuard } from '@lib/components'
import { addTranslations } from '@lib/utils/i18n'

import { TopSQLList } from './pages/List/List'
import { TopSQLContext } from './context'
import translations from './translations'

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
