import i18next from 'i18next'
import React from 'react'
import ReactDOM from 'react-dom'

import { telemetry, tz } from '@pingcap/tidb-dashboard-lib'
import { setupClient } from '~/client'
import { loadAppInfo, loadWhoAmI } from '~/utils/store'
import { GlobalConfigProvider, IGlobalConfig } from '~/utils/global-config'

import App from './App'

import './styles/style.less'
import '@pingcap/tidb-dashboard-lib/dist/index.css'
import './styles/override.less'

function renderApp(globalConfig: IGlobalConfig) {
  ReactDOM.render(
    <React.StrictMode>
      <GlobalConfigProvider value={globalConfig}>
        <App />
      </GlobalConfigProvider>
    </React.StrictMode>,
    document.getElementById('root')
  )
}

function trackRouteChange() {
  let preRoute = ''
  function handler(ev) {
    const loc = ev.detail.location
    if (loc.pathname !== preRoute) {
      telemetry.trackRouteChange('#' + loc.pathname)
      preRoute = loc.pathname
    }
  }
  window.addEventListener('dashboard:route-change', handler)
}

function start(globalConfig: IGlobalConfig) {
  const { apiPathBase, apiToken, mixpanelUser, timezone } = globalConfig

  // i18n
  i18next.changeLanguage('en')
  // timezone
  if (timezone !== null) {
    tz.setTimeZone(timezone)
  }
  // api client
  setupClient(apiPathBase, apiToken)
  loadWhoAmI()
  loadAppInfo()

  // telemetry
  telemetry.init(
    process.env.REACT_APP_MIXPANEL_HOST,
    process.env.REACT_APP_MIXPANEL_TOKEN
  )
  const {
    clusterInfo: { orgId, tenantPlan, projectId, clusterId, deployType }
  } = globalConfig
  telemetry.enable(
    `tidb-dashboard-for-dbaas-${process.env.REACT_APP_VERSION}`,
    {
      tenant_id: orgId,
      tenant_plan: tenantPlan,
      project_id: projectId,
      cluster_id: clusterId,
      deploy_type: deployType
    }
  )
  if (mixpanelUser) {
    telemetry.identifyUser(mixpanelUser)
  }
  trackRouteChange()

  renderApp(globalConfig)
}

export default start
