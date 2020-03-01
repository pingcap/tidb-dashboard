import { Breadcrumb } from 'antd'
import React, { useReducer } from 'react'
import { HashRouter as Router, Link, Route, Switch, withRouter } from 'react-router-dom'
import LogSearching from './LogSearching'
import LogSearchingDetail from './LogSearchingDetail'
import { Context, initialState, reducer } from './store'

const App = withRouter(props => {
  const { location } = props
  const page = location.pathname.split('/').pop()

  const [store, dispatch] = useReducer(reducer, initialState);

  return (
    <Context.Provider value={{ store, dispatch }}>
      <div>
        <div style={{ margin: 12 }}>
          <Breadcrumb>
            <Breadcrumb.Item>
              <Link to="/log/search">Log Searching</Link>
            </Breadcrumb.Item>
            {page === 'detail' && (
              <Breadcrumb.Item>Detail</Breadcrumb.Item>
            )}
          </Breadcrumb>
        </div>
        <div style={{ margin: 12 }}>
          <Switch>
            <Route exact path="/log/search">
              <LogSearching />
            </Route>
            <Route path="/log/search/detail">
              <LogSearchingDetail />
            </Route>
          </Switch>
        </div>
      </div>
    </Context.Provider>
  )
})

export default function () {
  return (
    <Router>
      <App />
    </Router>
  )
}
