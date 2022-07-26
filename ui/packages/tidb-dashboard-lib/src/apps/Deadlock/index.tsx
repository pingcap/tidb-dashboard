import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import useCache, { CacheContext } from '@lib/utils/useCache'
import { Root } from '@lib/components'
import { List, Detail } from './pages'
export default function () {
  const cache = useCache(32)
  return (
    <Root>
      <CacheContext.Provider value={cache}>
        <Router>
          <Routes>
            <Route path="/deadlock" element={<List />} />
            <Route path="/deadlock/detail" element={<Detail />} />
          </Routes>
        </Router>
      </CacheContext.Provider>
    </Root>
  )
}
