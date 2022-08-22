import i18next from 'i18next'
import React from 'react'
import ReactDOM from 'react-dom'

import { telemetry, tz } from '@pingcap/tidb-dashboard-lib'
import { setupClient } from '~/client'
import { loadAppInfo, loadWhoAmI } from '~/utils/store'

import App from './App'

import './styles/style.less'
import '@pingcap/tidb-dashboard-lib/dist/index.css'
import './styles/override.less'

function renderApp() {
  ReactDOM.render(
    <React.StrictMode>
      <App />
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

type StartOptions = {
  apiPathBase: string
  apiToken: string
  mixpanelUser: string
  timezone: number | null
}

function start({
  apiPathBase,
  apiToken,
  mixpanelUser,
  timezone
}: StartOptions) {
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
  telemetry.enable(`tidb-dashboard-for-dbaas-${process.env.REACT_APP_VERSION}`)
  if (mixpanelUser) {
    telemetry.identifyUser(mixpanelUser)
  }
  trackRouteChange()

  renderApp()
}

export default start
