import React from 'react'
import { HashRouter as Router, Route, Switch } from 'react-router-dom'
import ListPage from './pages/List'
import DetailPage from './pages/Detail'
import { FabricRoot } from '@/components'

const App = () => (
  <FabricRoot>
    <Router>
      <Switch>
        <Route exact path="/instance_profiling">
          <ListPage />
        </Route>
        <Route path="/instance_profiling/:id">
          <DetailPage />
        </Route>
      </Switch>
    </Router>
  </FabricRoot>
)

export default App
