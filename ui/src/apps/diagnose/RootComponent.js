import React from 'react'
import { HashRouter as Router, Switch, Route } from 'react-router-dom'
import { DiagnoseGenerator, DiagnoseStatus } from './components'

const App = () => (
  <Router>
    <Switch>
      <Route path="/diagnose/:id">
        <DiagnoseStatus />
      </Route>
      <Route path="/diagnose">
        <DiagnoseGenerator />
      </Route>
    </Switch>
  </Router>
)

export default App
