import mixpanel, { Config } from 'mixpanel-browser'
import { getPathInLocationHash } from './routing'

export { mixpanel }

export function init() {
  const token =
    process.env.REACT_APP_MIXPANEL_TOKEN || '00000000000000000000000000000000'
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
  const apiHost = process.env.REACT_APP_MIXPANEL_HOST
  if (apiHost) {
    options['api_host'] = apiHost
  }
  mixpanel.init(token, options)
  // disable mixpanel to report data immediately
  mixpanel.opt_out_tracking()
}

export function enable(dashboardVersion: string) {
  mixpanel.register({
    $current_url: getPathInLocationHash(),
    dashboard_version: dashboardVersion
  })
  mixpanel.opt_in_tracking()
}

// TODO: refine naming
export function trackRouteChange(curRoute: string) {
  mixpanel.register({
    $current_url: curRoute
  })
  mixpanel.track('Page Change')
}

export default {
  init,
  enable,
  mixpanel,
  trackRouteChange
}
