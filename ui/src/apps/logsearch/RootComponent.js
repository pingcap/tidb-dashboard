import React, { useEffect, useReducer } from 'react'
import {
  HashRouter as Router,
  Switch,
  Route,
  Redirect,
  Link,
  withRouter
} from 'react-router-dom'
import { Breadcrumb } from 'antd'

import client from '@/utils/client';

import LogSearching from './LogSearching'
import LogSearchingDetail from './LogSearchingDetail'

import {
  Context, 
  initialState, 
  reducer 
} from './store'

const App = withRouter(props => {
  const { location } = props
  const page = location.pathname.split('/').pop()

  const [store, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    client.dashboard.logsTasksGet().then(res => {
      // use the last items as current taskGroup
      const id = res.data?.slice(-1)?.[0]?.task_group_id ?? ''
      dispatch({type: 'task_group_id', payload: id})
    })
  }, [])

  return (
    <Context.Provider value={{store, dispatch}}>
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
          <Route exact path="/logsearch">
            <LogSearching />
          </Route>
          <Route path="/logsearch/detail">
            <LogSearchingDetail />
          </Route>
        </Switch>
      </div>
    </div>
    </Context.Provider>
  )
})

export default function() {
  return (
    <Router>
      <App />
    </Router>
  )
}
