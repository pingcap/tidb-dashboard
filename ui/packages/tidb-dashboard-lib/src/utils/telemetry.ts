import mixpanel, { Config } from 'mixpanel-browser'
import { getPathInLocationHash } from './routing'

export { mixpanel }

function init(apiHost?: string, token?: string) {
  let options: Partial<Config> = {
    autotrack: false,
    opt_out_tracking_by_default: true,
    batch_requests: true,
    persistence: 'localStorage',
    property_blacklist: [
      '$initial_referrer',
      '$initial_referring_domain',
      '$referrer',
      '$referring_domain'
    ],
    debug: process.env.NODE_ENV === 'development'
  }
  if (apiHost) {
    options['api_host'] = apiHost
  }
  mixpanel.init(token || '00000000000000000000000000000000', options)
  // disable mixpanel to report data immediately
  mixpanel.opt_out_tracking()
}

function enable(
  dashboardVersion: string,
  extraData: { [k: string]: any } = {}
) {
  mixpanel.register({
    $current_url: getPathInLocationHash(),
    dashboard_version: dashboardVersion,
    ...extraData
  })
  mixpanel.opt_in_tracking()
}

function identifyUser(userId: string) {
  mixpanel.identify(userId)
}

// TODO: refine naming
function trackRouteChange(curRoute: string) {
  mixpanel.register({
    $current_url: curRoute
  })
  mixpanel.track('Page Change')
}

export default {
  init,
  enable,
  identifyUser,
  trackRouteChange
}
