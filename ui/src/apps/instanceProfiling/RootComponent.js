import React from 'react'
import { HashRouter as Router, Route, Switch } from 'react-router-dom'
import ListPage from './pages/List'
import DetailPage from './pages/Detail'

const App = () => (
  <div>
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
  </div>
)

export default App
