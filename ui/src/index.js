import * as singleSpa from 'single-spa'
import AppRegistry from '@/utils/registry'
import * as routingUtil from '@/utils/routing'
import * as authUtil from '@/utils/auth'
import * as i18nUtil from '@/utils/i18n'
import * as clientUtil from '@/utils/client'

import * as LayoutMain from '@/layout/main'
import * as LayoutSignIn from '@/layout/signin'
import AppDashboardSettings from '@/apps/dashboardSettings'
import AppUserProfile from '@/apps/userProfile'
import AppOverview from '@/apps/overview'
import AppKeyVis from '@/apps/keyvis'
import AppStatement from '@/apps/statement'
import AppDiagnose from '@/apps/diagnose'
import AppSearchLogs from '@/apps/searchLogs'
import AppInstanceProfiling from '@/apps/instanceProfiling'
import AppClusterInfo from '@/apps/clusterInfo'
import AppPlayground from '@/apps/playground'

import './index.less'

async function main() {
  clientUtil.init()

  i18nUtil.init()
  i18nUtil.addTranslations(
    require.context('@/layout/translations/', false, /\.yaml$/)
  )

  const registry = new AppRegistry()

  singleSpa.registerApplication(
    'layout',
    LayoutMain,
    () => {
      return !routingUtil.isLocationMatchPrefix(authUtil.signInRoute)
    },
    { registry }
  )

  singleSpa.registerApplication(
    'signin',
    LayoutSignIn,
    () => {
      return routingUtil.isLocationMatchPrefix(authUtil.signInRoute)
    },
    { registry }
  )

  registry
    .register(AppDashboardSettings)
    .register(AppUserProfile)
    .register(AppOverview)
    .register(AppKeyVis)
    .register(AppStatement)
    .register(AppClusterInfo)
    .register(AppDiagnose)
    .register(AppSearchLogs)
    .register(AppInstanceProfiling)
    .register(AppPlayground)

  if (routingUtil.isLocationMatch('/')) {
    singleSpa.navigateToUrl('#' + registry.getDefaultRouter())
  }

  window.addEventListener('single-spa:app-change', () => {
    const spinner = document.getElementById('dashboard_page_spinner')
    if (spinner) {
      spinner.remove()
    }
    if (!routingUtil.isLocationMatchPrefix(authUtil.signInRoute)) {
      if (!authUtil.getAuthTokenAsBearer()) {
        singleSpa.navigateToUrl('#' + authUtil.signInRoute)
        return
      }
    }
  })

  singleSpa.start()
}

main()
