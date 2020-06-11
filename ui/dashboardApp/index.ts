import '@lib/utils/wdyr'

import * as singleSpa from 'single-spa'

import LayoutMain from '@dashboard/layout/main'
import LayoutSignIn from '@dashboard/layout/signin'
import LayoutFull from '@dashboard/layout/full'

import AppClusterInfo from '@lib/apps/ClusterInfo/index.meta'
import AppDashboardSettings from '@lib/apps/DashboardSettings/index.meta'
import AppDebugPlayground from '@lib/apps/DebugPlayground/index.meta'
import AppDiagnose from '@lib/apps/Diagnose/index.meta'
import AppInstanceProfiling from '@lib/apps/InstanceProfiling/index.meta'
import AppKeyViz from '@lib/apps/KeyViz/index.meta'
import AppOverview from '@lib/apps/Overview/index.meta'
import AppSearchLogs from '@lib/apps/SearchLogs/index.meta'
import AppSlowQuery from '@lib/apps/SlowQuery/index.meta'
import AppStatement from '@lib/apps/Statement/index.meta'
import AppUserProfile from '@lib/apps/UserProfile/index.meta'

import * as client from '@lib/utils/apiClient'
import * as auth from '@lib/utils/auth'
import * as i18n from '@lib/utils/i18n'
import AppRegistry from '@lib/utils/registry'
import * as routing from '@lib/utils/routing'

type AppOptions = {
  isPortal?: boolean
  token?: string
  lang?: string
  hideNav?: boolean
}

const defOptions: AppOptions = {
  isPortal: false,
  token: '',
  lang: '',
  hideNav: false,
}

async function main(appOptions: AppOptions = defOptions) {
  // handle options
  if (appOptions.isPortal) {
    auth.setStore(new auth.MemAuthTokenStore())
    auth.setAuthToken(appOptions.token)
  } else {
    auth.setStore(new auth.LocalStorageAuthTokenStore())
  }
  if (appOptions.lang) {
    i18n.changeLang(appOptions.lang)
  }

  client.init()

  i18n.addTranslations(
    require.context('@dashboard/layout/translations/', false, /\.yaml$/)
  )

  const registry = new AppRegistry()

  singleSpa.registerApplication(
    'layout',
    AppRegistry.newReactSpaApp(
      () => (appOptions.hideNav ? LayoutFull : LayoutMain),
      'root'
    ),
    () => {
      return !routing.isLocationMatchPrefix(auth.signInRoute)
    },
    { registry }
  )

  singleSpa.registerApplication(
    'signin',
    AppRegistry.newReactSpaApp(() => LayoutSignIn, 'root'),
    () => {
      return routing.isLocationMatchPrefix(auth.signInRoute)
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
    if (!routing.isLocationMatchPrefix(auth.signInRoute)) {
      if (!auth.getAuthTokenAsBearer()) {
        singleSpa.navigateToUrl('#' + auth.signInRoute)
      }
    }
  })

  singleSpa.start()
}

/////////////////////////////////////

if (window.location.pathname.endsWith('/portal')) {
  function handleConfigEvent(event) {
    const appOptions = event.data
    const { token, lang, hideNav } = appOptions
    main({
      isPortal: true,
      token,
      lang,
      hideNav,
    })
    window.removeEventListener('message', handleConfigEvent)
  }
  window.addEventListener('message', handleConfigEvent)
} else {
  main()
}
