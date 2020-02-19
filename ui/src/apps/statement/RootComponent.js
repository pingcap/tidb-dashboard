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

// import StatementsOverviewDemo from './StatementsOverviewDemo'
// import StatementDetailDemo from './StatementDetailDemo'
import StatementsOverviewPage from './StatementsOverviewPage'
import StatementDetailPage from './StatementDetailPage'

const App = withRouter(props => {
  const { location } = props
  const page = location.pathname.split('/').pop()

  return (
    <div>
      <div style={{ margin: 12 }}>
        <Breadcrumb>
          <Breadcrumb.Item>
            <Link to="/statement/overview">Statements Overview</Link>
          </Breadcrumb.Item>
          {page === 'detail' && (
            <Breadcrumb.Item>Statement Detail</Breadcrumb.Item>
          )}
        </Breadcrumb>
      </div>
      <div style={{ margin: 12 }}>
        <Switch>
          <Route path="/statement/overview">
            <StatementsOverviewPage />
          </Route>
          <Route path="/statement/detail">
            <StatementDetailPage />
          </Route>
          <Redirect exact from="/statement" to="/statement/overview" />
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
