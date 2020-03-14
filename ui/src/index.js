import * as singleSpa from 'single-spa'
import AppRegistry from '@/utils/registry'
import * as routingUtil from '@/utils/routing'
import * as authUtil from '@/utils/auth'
import * as i18nUtil from '@/utils/i18n'

import * as LayoutMain from '@/layout'
import * as LayoutSignIn from '@/layout/signin'
import appKeyVis from '@/apps/keyvis'
import appStatement from '@/apps/statement'
import appDiagnose from '@/apps/diagnose'
import appLogSearching from '@/apps/logSearching'
import appNodeProfiling from '@/apps/nodeProfiling'
import appClusterInfo from '@/apps/clusterInfo'

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
    .register(appKeyVis)
    .register(appStatement)
    .register(appClusterInfo)
    .register(appDiagnose)
    .register(appLogSearching)
    .register(appNodeProfiling)

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
