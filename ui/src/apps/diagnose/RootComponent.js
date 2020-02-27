import React from 'react'
import { HashRouter as Router, Switch, Route } from 'react-router-dom'
import { DiagnoseGenerator } from './components'
import client from '@/utils/client'

const App = () => (
  <Router>
    <div style={{ margin: 12 }}>
      <Switch>
        <Route path="/diagnose">
          <DiagnoseGenerator basePath={client.basePath} />
        </Route>
      </Switch>
    </div>
  </Router>
)

export default App
