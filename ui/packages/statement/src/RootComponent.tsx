import React, { useState, useEffect } from 'react'
import {
  HashRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
} from 'react-router-dom'
import { Breadcrumb } from 'antd'

import client from '@pingcap-incubator/dashboard_client'

import { SearchContext, SearchOptions } from './components'
import { StatementsOverviewPage, StatementDetailPage } from './pages'

const App = (props) => {
  const navigate = useNavigate()
  const location = useLocation()
  const page = location.pathname.split('/').pop()

  const [searchOptions, setSearchOptions] = useState({
    curInstance: undefined,
    curSchemas: [],
    curTimeRange: undefined,
  } as SearchOptions)
  const searchContext = { searchOptions, setSearchOptions }
  useEffect(() => {
    navigate('/statement/overview')
  }, [])
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
          <Routes>
            <Route
              path="/statement/overview"
              element={
                <StatementsOverviewPage
                  dashboardClient={client.getInstance()}
                  detailPagePath="/statement/detail"
                />
              }
            />
            <Route
              path="/statement/detail"
              element={
                <StatementDetailPage dashboardClient={client.getInstance()} />
              }
            />
          </Routes>
        </div>
      </div>
    </SearchContext.Provider>
  )
}

export default function () {
  return (
    <Router>
      <App />
    </Router>
  )
}
