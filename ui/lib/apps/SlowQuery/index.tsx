import React from 'react'
import { Root } from '@lib/components'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import useCache, { CacheContext } from '@lib/utils/useCache'

import { List, Detail } from './pages'

export default function () {
  const slowQueryCacheMgr = useCache()

  return (
    <Root>
      <CacheContext.Provider value={slowQueryCacheMgr}>
        <Router>
          <Routes>
            <Route path="/slow_query" element={<List />} />
            <Route path="/slow_query/detail" element={<Detail />} />
          </Routes>
        </Router>
      </CacheContext.Provider>
    </Root>
  )
}

export * from './components'
export * from './pages'
export * from './utils/useSlowQueryTableController'
export { default as useSlowQueryTableController } from './utils/useSlowQueryTableController'
