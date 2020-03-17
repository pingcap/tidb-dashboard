import axios from 'axios'
import * as singleSpa from 'single-spa'
import { message } from 'antd'
import i18next from 'i18next'

import AppRegistry from '@/utils/registry'
import * as routingUtil from '@/utils/routing'
import * as authUtil from '@/utils/auth'
import * as i18nUtil from '@/utils/i18n'
import * as client from '@/utils/client'

import LayoutMain from '@/layout'
import LayoutSignIn from '@/layout/signin'
import appMetaKeyVis from '@/apps/keyvis/meta'
import appMetaStatement from '@/apps/statement/meta'
import appMetaDiagnose from '@/apps/diagnose/meta'
import appMetaLogSearching from '@/apps/logSearching/meta'
import appMetaNodeProfiling from '@/apps/nodeProfiling/meta'
import appMetaClusterInfo from '@/apps/clusterInfo/meta'

function initClient() {
  let DASHBOARD_API_URL_PERFIX = 'http://127.0.0.1:12333'
  if (process.env.REACT_APP_DASHBOARD_API_URL !== undefined) {
    // Accept empty string as dashboard API URL as well.
    DASHBOARD_API_URL_PERFIX = process.env.REACT_APP_DASHBOARD_API_URL
  }

  const basePath = `${DASHBOARD_API_URL_PERFIX}/dashboard/api`
  console.log(`Dashboard API URL: ${basePath}`)

  // FIXME: We should not use a global axios instance
  axios.interceptors.response.use(undefined, function(err) {
    const { response } = err
    // Handle unauthorized error in a unified way
    if (
      response &&
      response.data &&
      response.data.code === 'error.api.unauthorized'
    ) {
      if (
        !routingUtil.isLocationMatch('/') &&
        !routingUtil.isLocationMatchPrefix(authUtil.signInRoute)
      ) {
        message.error(i18next.t('error.message.unauthorized'))
      }
      authUtil.clearAuthToken()
      singleSpa.navigateToUrl('#' + authUtil.signInRoute)
      err.handled = true
    } else if (err.message === 'Network Error') {
      message.error(i18next.t('error.message.network'))
      err.handled = true
    }
    return Promise.reject(err)
  })

  client.setGlobalByOptions({
    basePath,
    apiKey: () => authUtil.getAuthTokenAsBearer(),
  })
}

function initAppRegistry() {
  const registry = new AppRegistry()

  singleSpa.registerApplication(
    'layout',
    AppRegistry.newReactSpaApp(() => LayoutMain, 'root'),
    () => {
      return !routingUtil.isLocationMatchPrefix(authUtil.signInRoute)
    },
    { registry }
  )

  singleSpa.registerApplication(
    'signin',
    AppRegistry.newReactSpaApp(() => LayoutSignIn, 'root'),
    () => {
      return routingUtil.isLocationMatchPrefix(authUtil.signInRoute)
    },
    { registry }
  )

  i18nUtil.init()
  i18nUtil.addTranslations(
    require.context('@/layout/translations/', false, /\.yaml$/)
  )

  registry
    .registerMeta(appMetaKeyVis)
    .registerMeta(appMetaStatement)
    .registerMeta(appMetaClusterInfo)
    .registerMeta(appMetaDiagnose)
    .registerMeta(appMetaLogSearching)
    .registerMeta(appMetaNodeProfiling)

  if (routingUtil.isLocationMatch('/')) {
    singleSpa.navigateToUrl('#' + registry.getDefaultRouter())
  }
}

async function main() {
  initClient()
  initAppRegistry()

  window.addEventListener('single-spa:app-change', () => {
    const spinner = document.getElementById('dashboard_page_spinner')
    if (spinner) {
      spinner.remove()
    }
    if (!routingUtil.isLocationMatchPrefix(authUtil.signInRoute)) {
      // FIXME: We also need to check whether token is valid
      if (!authUtil.getAuthTokenAsBearer()) {
        singleSpa.navigateToUrl('#' + authUtil.signInRoute)
        return
      }
    }
  })

  singleSpa.start()
}

main()
