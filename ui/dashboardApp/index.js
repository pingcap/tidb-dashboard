import * as singleSpa from 'single-spa'
import AppRegistry from '@dashboard/registry'
import * as routing from '@dashboard/routing'

import * as auth from '@lib/utils/auth'
import * as i18n from '@lib/utils/i18n'
import * as client from '@dashboard/client'

import LayoutMain from '@dashboard/layout/main'
import LayoutSignIn from '@dashboard/layout/signin'

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

async function main() {
  client.init()

  i18n.addTranslations(
    require.context('@dashboard/layout/translations/', false, /\.yaml$/)
  )

  const registry = new AppRegistry()

  singleSpa.registerApplication(
    'layout',
    AppRegistry.newReactSpaApp(() => LayoutMain, 'root'),
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
        return
      }
    }
  })

  singleSpa.start()
}

main()
