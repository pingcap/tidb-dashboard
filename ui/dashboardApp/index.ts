import '@lib/utils/wdyr'

import * as singleSpa from 'single-spa'
import i18next from 'i18next'
import { Modal } from 'antd'
import NProgress from 'nprogress'
import './nprogress.less'

import AppRegistry from '@lib/utils/registry'
import * as routing from '@lib/utils/routing'
import * as auth from '@lib/utils/auth'
import * as i18n from '@lib/utils/i18n'
import { saveAppOptions, loadAppOptions } from '@lib/utils/appOptions'
import * as telemetry from '@lib/utils/telemetry'
import client, { ErrorStrategy, InfoInfoResponse } from '@lib/client'

import LayoutMain from '@dashboard/layout/main'
import LayoutSignIn from '@dashboard/layout/signin'

import AppUserProfile from '@lib/apps/UserProfile/index.meta'
import AppOverview from '@lib/apps/Overview/index.meta'
import AppClusterInfo from '@lib/apps/ClusterInfo/index.meta'
import AppKeyViz from '@lib/apps/KeyViz/index.meta'
import AppStatement from '@lib/apps/Statement/index.meta'
import AppSystemReport from '@lib/apps/SystemReport/index.meta'
import AppSlowQuery from '@lib/apps/SlowQuery/index.meta'
import AppDiagnose from '@lib/apps/Diagnose/index.meta'
import AppSearchLogs from '@lib/apps/SearchLogs/index.meta'
import AppInstanceProfiling from '@lib/apps/InstanceProfiling/index.meta'
import AppQueryEditor from '@lib/apps/QueryEditor/index.meta'
import AppConfiguration from '@lib/apps/Configuration/index.meta'
import AppDebugAPI from '@lib/apps/DebugAPI/index.meta'
// import __APP_NAME__ from '@lib/apps/__APP_NAME__/index.meta'
// NOTE: Don't remove above comment line, it is a placeholder for code generator

function removeSpinner() {
  const spinner = document.getElementById('dashboard_page_spinner')
  if (spinner) {
    spinner.remove()
  }
}

async function main() {
  const options = loadAppOptions()
  if (options.lang) {
    i18next.changeLanguage(options.lang)
  }
  i18n.addTranslations(
    require.context('@dashboard/layout/translations/', false, /\.yaml$/)
  )

  let info: InfoInfoResponse

  try {
    const i = await client.getInstance().infoGet({
      errorStrategy: ErrorStrategy.Custom,
    })
    info = i.data
  } catch (e) {
    Modal.error({
      title: 'Failed to connect to TiDB Dashboard server',
      content: '' + e,
      okText: 'Reload',
      onOk: () => window.location.reload(),
    })
    removeSpinner()
    return
  }

  await telemetry.init(info)

  const registry = new AppRegistry(options)

  NProgress.configure({
    showSpinner: false,
  })
  window.addEventListener('single-spa:before-routing-event', () => {
    NProgress.set(0.2)
  })
  window.addEventListener('single-spa:routing-event', () => {
    NProgress.done(true)
  })

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
    .register(AppUserProfile)
    .register(AppOverview)
    .register(AppClusterInfo)
    .register(AppKeyViz)
    .register(AppStatement)
    .register(AppSystemReport)
    .register(AppSlowQuery)
    .register(AppDiagnose)
    .register(AppSearchLogs)
    .register(AppInstanceProfiling)
    .register(AppQueryEditor)
    .register(AppConfiguration)
    .register(AppDebugAPI)
  // .register(__APP_NAME__)
  // NOTE: Don't remove above comment line, it is a placeholder for code generator

  if (routing.isLocationMatch('/')) {
    singleSpa.navigateToUrl('#' + registry.getDefaultRouter())
  }

  window.addEventListener('single-spa:app-change', () => {
    if (!routing.isSignInPage()) {
      if (!auth.getAuthTokenAsBearer()) {
        singleSpa.navigateToUrl('#' + routing.signInRoute)
      }
    }
  })

  let preRoute = ''
  window.addEventListener('single-spa:routing-event', () => {
    removeSpinner()

    const curRoute = routing.getPathInLocationHash()
    if (curRoute !== preRoute) {
      telemetry.mixpanel.register({
        $current_url: curRoute,
      })
      telemetry.mixpanel.track('PageChange')
      preRoute = curRoute
    }
  })

  singleSpa.start()
}

/////////////////////////////////////

if (routing.isPortalPage()) {
  // the portal page is only used to receive options
  window.addEventListener(
    'message',
    (event) => {
      const { token, lang, hideNav, redirectPath } = event.data
      auth.setAuthToken(token)
      saveAppOptions({ hideNav, lang })
      window.location.hash = `#${redirectPath}`
      window.location.reload()
    },
    { once: true }
  )
} else {
  main()
}
