import React from 'react';
import {
  HashRouter as Router,
  Switch,
  Route,
  Link,
  withRouter
} from 'react-router-dom'
import { Breadcrumb } from 'antd'

import LogSearching from './LogSearching'
import LogSearchingDetail from './LogSearchingDetail'

const App = withRouter(props => {
  const { location } = props
  const page = location.pathname.split('/').pop()

  return (
    <div>
      <div style={{ margin: 12 }}>
        <Breadcrumb>
          <Breadcrumb.Item>
            <Link to="/logsearch">Log Searching</Link>
          </Breadcrumb.Item>
          {page === 'detail' && (
            <Breadcrumb.Item>Detail</Breadcrumb.Item>
          )}
        </Breadcrumb>
      </div>
      <div style={{ margin: 12 }}>
        <Switch>
          <Route path="/logsearch">
            <LogSearching />
          </Route>
          <Route path="/logsearch/detail">
            <LogSearchingDetail />
          </Route>
        </Switch>
      </div>
    </div>
  )
})

export default function() {
  return (
    <Router>
      <App />
    </Router>
  )
}
