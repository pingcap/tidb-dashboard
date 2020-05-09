import React from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import { Root } from '@lib/components'

import DetailPage from './pages/Detail'
import ListPage from './pages/List'

const App = () => (
  <Root>
    <Router>
      <Routes>
        <Route
          exact
          path="/instance_profiling"
          element={<ListPage key={Math.random()} />}
        />
        <Route
          path="/instance_profiling/:id"
          element={<DetailPage key={Math.random()} />}
        />
      </Routes>
    </Router>
  </Root>
)

export default App
