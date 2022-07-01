import i18next from 'i18next'
import React from 'react'
import ReactDOM from 'react-dom'

import { telemetry } from '@pingcap/tidb-dashboard-lib'
import { setupClient } from '~/client'
import { reloadWhoAmI } from '~/utils/store'

import App from './App'

import '@pingcap/tidb-dashboard-lib/dist/index.css'
import './styles/style.less'
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
}

function start({ apiPathBase, apiToken }: StartOptions) {
  // i18n
  i18next.changeLanguage('en')

  // api client
  setupClient(apiPathBase, apiToken)
  reloadWhoAmI()

  // telemetry
  telemetry.init()
  telemetry.enable(`tidb-dashboard-for-dbaas-${process.env.REACT_APP_VERSION}`)
  trackRouteChange()

  renderApp()
}

export default start
