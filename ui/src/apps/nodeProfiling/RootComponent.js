import React from 'react'
import { HashRouter as Router, Route, Switch } from 'react-router-dom'
import ListPage from './pages/List'
import DetailPage from './pages/Detail'

const App = () => (
  <div style={{ padding: 24 }}>
    <Router>
      <Switch>
        <Route exact path="/node_profiling">
          <ListPage />
        </Route>
        <Route path="/node_profiling/:id">
          <DetailPage />
        </Route>
      </Switch>
    </Router>
  </div>
)

export default App
