import React from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import ListPage from './pages/List'
import DetailPage from './pages/Detail'
import { FabricRoot } from '@/components'

const App = () => (
  <FabricRoot>
    <Router>
      <Routes>
        <Route
          exact
          path="/instance_profiling"
          render={() => <ListPage key={Math.random()} />}
        />
        <Route
          path="/instance_profiling/:id"
          render={() => <DetailPage key={Math.random()} />}
        />
      </Routes>
    </Router>
  </FabricRoot>
)

export default App
