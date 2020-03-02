import * as singleSpa from 'single-spa'
import AppRegistry from '@/utils/registry'
import * as routingUtil from '@/utils/routing'
import * as authUtil from '@/utils/auth'
import * as i18nUtil from '@/utils/i18n'

import * as LayoutMain from '@/layout'
import * as LayoutSignIn from '@/layout/signin'
import AppKeyVis from '@/apps/keyvis'
import AppHome from '@/apps/home'
import AppDemo from '@/apps/demo'
import AppStatement from '@/apps/statement'
import AppDiagnose from '@/apps/diagnose'
import AppLogSearching from '@/apps/logSearching'
import AppNodeProfiling from '@/apps/nodeProfiling'
import AppClusterInfo from '@/apps/clusterInfo'

async function main() {
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

  i18nUtil.init()
  i18nUtil.addTranslations(
    require.context('@/layout/translations/', false, /\.yaml$/)
  )

  registry
    .register(AppKeyVis)
    .register(AppHome)
    .register(AppDemo)
    .register(AppStatement)
    .register(AppClusterInfo)
    .register(AppDiagnose)
    .register(AppLogSearching)
    .register(AppNodeProfiling)

  if (routingUtil.isLocationMatch('/')) {
    singleSpa.navigateToUrl('#' + registry.getDefaultRouter())
  }

  window.addEventListener('single-spa:app-change', () => {
    if (!routingUtil.isLocationMatchPrefix(authUtil.signInRoute)) {
      if (!authUtil.getAuthTokenAsBearer()) {
        singleSpa.navigateToUrl('#' + authUtil.signInRoute)
        return
      }
    }
  })

  singleSpa.start()
  document.getElementById('dashboard_page_spinner').remove()
}

main()
