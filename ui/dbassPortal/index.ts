import '@lib/utils/wdyr'

import * as singleSpa from 'single-spa'

import LayoutMain from '@dbass/layout/main'

import AppKeyViz from '@lib/apps/KeyViz/index.meta'
import AppSlowQuery from '@lib/apps/SlowQuery/index.meta'
import AppStatement from '@lib/apps/Statement/index.meta'

import * as client from '@lib/utils/apiClient'
import * as auth from '@lib/utils/auth'
import AppRegistry from '@lib/utils/registry'
import * as routing from '@lib/utils/routing'

async function main() {
  client.init()

  const registry = new AppRegistry()

  singleSpa.registerApplication(
    'layout',
    AppRegistry.newReactSpaApp(() => LayoutMain, 'root'),
    () => {
      return !routing.isLocationMatchPrefix(auth.signInRoute)
    },
    { registry }
  )

  registry.register(AppStatement).register(AppSlowQuery).register(AppKeyViz)

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

/////////////////////////////////////////////////

window.addEventListener(
  'message',
  (event) => {
    console.log('event:', event)
    if (event.data.token) {
      main()
    }
  },
  false
)
