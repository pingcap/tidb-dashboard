import '@lib/utils/wdyr'

import * as singleSpa from 'single-spa'
import i18next from 'i18next'

import AppRegistry from '@lib/utils/registry'
import * as routing from '@lib/utils/routing'
import * as auth from '@lib/utils/auth'
import * as i18n from '@lib/utils/i18n'
import * as apiClient from '@lib/utils/apiClient'
import {
  AppOptions,
  saveAppOptions,
  loadAppOptions,
} from '@lib/utils/appOptions'
import * as telemetry from '@lib/utils/telemetry'

import LayoutMain from '@dashboard/layout/main'
import LayoutSignIn from '@dashboard/layout/signin'

import AppDebugPlayground from '@lib/apps/DebugPlayground/index.meta'
import AppDashboardSettings from '@lib/apps/DashboardSettings/index.meta'
import AppUserProfile from '@lib/apps/UserProfile/index.meta'
import AppOverview from '@lib/apps/Overview/index.meta'
import AppKeyViz from '@lib/apps/KeyViz/index.meta'
import AppStatement from '@lib/apps/Statement/index.meta'
import AppDiagnose from '@lib/apps/Diagnose/index.meta'
import AppSearchLogs from '@lib/apps/SearchLogs/index.meta'
import AppInstanceProfiling from '@lib/apps/InstanceProfiling/index.meta'
import AppClusterInfo from '@lib/apps/ClusterInfo/index.meta'
import AppSlowQuery from '@lib/apps/SlowQuery/index.meta'

async function main(options: AppOptions) {
  if (options.lang) {
    i18next.changeLanguage(options.lang)
  }
  i18n.addTranslations(
    require.context('@dashboard/layout/translations/', false, /\.yaml$/)
  )

  apiClient.init()
  await telemetry.init()

  const registry = new AppRegistry(options)

  singleSpa.registerApplication(
    'layout',
    AppRegistry.newReactSpaApp(() => LayoutMain, 'root'),
    () => {
      return !routing.isSignInPage()
    },
    { registry }
  )

  singleSpa.registerApplication(
    'signin',
    AppRegistry.newReactSpaApp(() => LayoutSignIn, 'root'),
    () => {
      return routing.isSignInPage()
    },
    { registry }
  )

  registry
    .register(AppDebugPlayground)
    .register(AppDashboardSettings)
    .register(AppUserProfile)
    .register(AppOverview)
    .register(AppKeyViz)
    .register(AppStatement)
    .register(AppClusterInfo)
    .register(AppDiagnose)
    .register(AppSearchLogs)
    .register(AppInstanceProfiling)
    .register(AppSlowQuery)

  if (routing.isLocationMatch('/')) {
    singleSpa.navigateToUrl('#' + registry.getDefaultRouter())
  }

  window.addEventListener('single-spa:app-change', () => {
    const spinner = document.getElementById('dashboard_page_spinner')
    if (spinner) {
      spinner.remove()
    }
    if (!routing.isSignInPage()) {
      if (!auth.getAuthTokenAsBearer()) {
        singleSpa.navigateToUrl('#' + routing.signInRoute)
      }
    }
  })

  window.addEventListener('single-spa:before-routing-event', () => {})

  window.addEventListener('single-spa:routing-event', () => {
    telemetry.mixpanel.register({
      $current_url: routing.getPathInLocationHash(),
    })
    telemetry.mixpanel.track('PageChange')
  })

  singleSpa.start()
}

/////////////////////////////////////

function start() {
  // the portal page is only used to receive options
  if (routing.isPortalPage()) {
    function handleConfigEvent(event) {
      const { token, lang, hideNav, redirectPath } = event.data
      auth.setAuthToken(token)
      saveAppOptions({ hideNav, lang })

      // redirect
      window.location.hash = `#${redirectPath}`
      window.location.reload()
    }

    window.addEventListener('message', handleConfigEvent, { once: true })
    return
  }

  main(loadAppOptions())
}

start()
