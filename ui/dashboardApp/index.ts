import '@lib/utils/wdyr'

import * as singleSpa from 'single-spa'
import i18next from 'i18next'
import { Modal } from 'antd'

import AppRegistry from '@lib/utils/registry'
import * as routing from '@lib/utils/routing'
import * as auth from '@lib/utils/auth'
import * as i18n from '@lib/utils/i18n'
import * as apiClient from '@lib/utils/apiClient'
import { saveAppOptions, loadAppOptions } from '@lib/utils/appOptions'
import * as telemetry from '@lib/utils/telemetry'
import client, { InfoInfoResponse } from '@lib/client'

import LayoutRoot from '@dashboard/layout/root'
import LayoutMain from '@dashboard/layout/main'
import LayoutSignIn from '@dashboard/layout/signin'

import AppUserProfile from '@lib/apps/UserProfile/index.meta'
import AppOverview from '@lib/apps/Overview/index.meta'
import AppKeyViz from '@lib/apps/KeyViz/index.meta'
import AppStatement from '@lib/apps/Statement/index.meta'
import AppSystemReport from '@lib/apps/SystemReport/index.meta'
import AppSearchLogs from '@lib/apps/SearchLogs/index.meta'
import AppInstanceProfiling from '@lib/apps/InstanceProfiling/index.meta'
import AppClusterInfo from '@lib/apps/ClusterInfo/index.meta'
import AppSlowQuery from '@lib/apps/SlowQuery/index.meta'

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

  apiClient.init()

  let info: InfoInfoResponse

  try {
    const i = await client.getInstance().getInfo()
    info = i.data
  } catch (e) {
    Modal.error({
      title: 'Failed to connect to TiDB Dashboard server',
      content: e.stack,
      okText: 'Reload',
      onOk: () => window.location.reload(),
    })
    removeSpinner()
    return
  }

  await telemetry.init(info)

  const registry = new AppRegistry(options)

  singleSpa.registerApplication(
    'root',
    AppRegistry.newReactSpaApp(() => LayoutRoot, 'root'),
    () => true,
    { registry }
  )

  singleSpa.registerApplication(
    'layout',
    AppRegistry.newReactSpaApp(() => LayoutMain, '__spa__main__'),
    () => {
      return !routing.isSignInPage()
    },
    { registry }
  )

  singleSpa.registerApplication(
    'signin',
    AppRegistry.newReactSpaApp(() => LayoutSignIn, '__spa__main__'),
    () => {
      return routing.isSignInPage()
    },
    { registry }
  )

  registry
    .register(AppUserProfile)
    .register(AppOverview)
    .register(AppKeyViz)
    .register(AppStatement)
    .register(AppClusterInfo)
    .register(AppSystemReport)
    .register(AppSearchLogs)
    .register(AppInstanceProfiling)
    .register(AppSlowQuery)

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

  window.addEventListener('single-spa:before-routing-event', () => {})

  window.addEventListener('single-spa:routing-event', () => {
    removeSpinner()
    telemetry.mixpanel.register({
      $current_url: routing.getPathInLocationHash(),
    })
    telemetry.mixpanel.track('PageChange')
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
