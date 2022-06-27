import i18next from 'i18next'
import React from 'react'
import ReactDOM from 'react-dom'

import { setupClient } from '~/client'

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

function start(apiPathBase: string, token: string) {
  i18next.changeLanguage('en')
  setupClient(apiPathBase, token)

  renderApp()
}

export default start
