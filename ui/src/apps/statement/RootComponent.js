import React from 'react'
import {
  HashRouter as Router,
  Switch,
  Route,
  Redirect,
  Link
} from 'react-router-dom'
import { Menu } from 'antd'

import StatementListDemo from './StatementListDemo'

const App = () => (
  <Router>
    <Menu mode='horizontal'>
      <Menu.Item>
        <Link to='/statement/list'>Statement/List</Link>
      </Menu.Item>
      <Menu.Item>
        <Link to='/statement/detail'>Statement/Detail</Link>
      </Menu.Item>
    </Menu>
    <div style={{ margin: 12 }}>
      <Switch>
        <Route path='/statement/list'>
          <StatementListDemo />
        </Route>
        <Route path='/statement/detail'>
          <p>Statement Detail: TODO</p>
        </Route>
        <Redirect exact from='/statement' to='/statement/list' />
      </Switch>
    </div>
  </Router>
)

export default App
