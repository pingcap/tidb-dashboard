import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'

import { Root } from '@lib/components'
import useCache, { CacheContext } from '@lib/utils/useCache'

import { Detail, List } from './pages'

export default function () {
  const statementCacheMgr = useCache(2)

  return (
    <Root>
      <CacheContext.Provider value={statementCacheMgr}>
        <Router>
          <Routes>
            <Route path="/statement" element={<List />} />
            <Route path="/statement/detail" element={<Detail />} />
          </Routes>
        </Router>
      </CacheContext.Provider>
    </Root>
  )
}

// export * from './components'
// export * from './pages'
// export * from './utils/useStatementTableController'
// export { default as useStatementTableController } from './utils/useStatementTableController'

export { default as StatementAppMeta } from './index.meta'
