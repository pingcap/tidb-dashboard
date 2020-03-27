import React from 'react'
import { HashRouter as Router, Route, Switch } from 'react-router-dom'
import ListPage from './pages/List'
import DetailPage from './pages/Detail'
import { FabricRoot } from '@/components'

const App = () => (
  <FabricRoot>
    <Router>
      <Switch>
        <Route
          exact
          path="/instance_profiling"
          render={() => <ListPage key={Math.random()} />}
        />
        <Route
          path="/instance_profiling/:id"
          render={() => <DetailPage key={Math.random()} />}
        />
      </Switch>
    </Router>
  </FabricRoot>
)

export default App
