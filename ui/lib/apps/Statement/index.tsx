import React, { useState } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'

import { Root } from '@lib/components'
import { SearchContext, SearchOptions, StatementsOverview } from './components'
import { Detail } from './pages'

const App = () => {
  const [searchOptions, setSearchOptions] = useState({
    curInstance: undefined,
    curSchemas: [],
    curTimeRange: undefined,
    curStmtTypes: [],
  } as SearchOptions)
  const searchContext = { searchOptions, setSearchOptions }

  return (
    <SearchContext.Provider value={searchContext}>
      <Routes>
        <Route path="/statement" element={<StatementsOverview />} />
        <Route
          path="/statement/detail"
          element={<Detail key={Math.random()} />}
        />
      </Routes>
    </SearchContext.Provider>
  )
}

export default function () {
  return (
    <Root>
      <Router>
        <App />
      </Router>
    </Root>
  )
}

export * from './components'
export * from './pages'
