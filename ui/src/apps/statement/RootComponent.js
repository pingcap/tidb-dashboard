import React from 'react'
import {
  HashRouter as Router,
  Switch,
  Route,
  Redirect,
  Link,
  withRouter
} from 'react-router-dom'
import { Breadcrumb } from 'antd'

// import StatementListDemo from './StatementListDemo'
// import StatementDetailDemo from './StatementDetailDemo'
import StatementListPage from './StatementListPage'
import StatementDetailPage from './StatementDetailPage'

const App = withRouter(props => {
  const { location } = props
  const page = location.pathname.split('/').pop()

  return (
    <div>
      <div style={{ margin: 12 }}>
        <Breadcrumb>
          <Breadcrumb.Item>
            <Link to="/statement/list">Statement List</Link>
          </Breadcrumb.Item>
          {page === 'detail' && (
            <Breadcrumb.Item>Statement Detail</Breadcrumb.Item>
          )}
        </Breadcrumb>
      </div>
      <div style={{ margin: 12 }}>
        <Switch>
          <Route path="/statement/list">
            <StatementListPage />
          </Route>
          <Route path="/statement/detail">
            <StatementDetailPage />
          </Route>
          <Redirect exact from="/statement" to="/statement/list" />
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
