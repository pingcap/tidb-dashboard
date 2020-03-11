import { Breadcrumb } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { HashRouter as Router, Link, Route, Switch, withRouter } from 'react-router-dom'
import LogSearching from './LogSearching'
import LogSearchingDetail from './LogSearchingDetail'
import LogSearchingHistory from './LogSearchingHistory'

const App = withRouter(props => {
  const { t } = useTranslation()

  const { location } = props
  const page = location.pathname.split('/')[3]

  return (
    <div>
      <div style={{ margin: 12 }}>
        <Breadcrumb>
          <Breadcrumb.Item>
            <Link to="/log/search">{t('log_searching.nav.log_searching')}</Link>
          </Breadcrumb.Item>
          {page === 'detail' && (
            <Breadcrumb.Item>{t('log_searching.nav.detail')}</Breadcrumb.Item>
          )}
          {page === 'history' && (
            <Breadcrumb.Item>{t('log_searching.nav.history')}</Breadcrumb.Item>
          )}
        </Breadcrumb>
      </div>
      <div style={{ margin: 12 }}>
        <Switch>
          <Route exact path="/log/search">
            <LogSearching />
          </Route>
          <Route path="/log/search/history">
            <LogSearchingHistory />
          </Route>
          <Route path="/log/search/detail/:id">
            <LogSearchingDetail />
          </Route>
        </Switch>
      </div>
    </div>
  )
})

export default function () {
  return (
    <Router>
      <App />
    </Router>
  )
}
