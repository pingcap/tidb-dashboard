import React, { useState } from 'react'
import {
  HashRouter as Router,
  Switch,
  Route,
  Redirect,
  Link,
  withRouter
} from 'react-router-dom'
import { Breadcrumb } from 'antd'

import StatementsOverviewPage from './StatementsOverviewPage'
import StatementDetailPage from './StatementDetailPage'
import { SearchContext } from './components'

const App = withRouter(props => {
  const { location } = props
  const page = location.pathname.split('/').pop()

  const [searchOptions, setSearchOptions] = useState({
    curInstance: undefined,
    curSchemas: [],
    curTimeRange: undefined
  })
  const searchContext = { searchOptions, setSearchOptions }

  return (
    <SearchContext.Provider value={searchContext}>
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
    </SearchContext.Provider>
  )
})

export default function() {
  return (
    <Router>
      <App />
    </Router>
  )
}
