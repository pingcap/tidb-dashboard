import mixpanel from 'mixpanel-browser'
import client from '@lib/client'
import { getPathInLocationHash } from './routing'

export { mixpanel }

export async function init() {
  const token =
    process.env.REACT_APP_MIXPANEL_TOKEN || '00000000000000000000000000000000'
  let options = {
    autotrack: false,
    opt_out_tracking_by_default: true,
    batch_requests: true,
    persistence: 'localStorage',
    property_blacklist: [
      '$initial_referrer',
      '$initial_referring_domain',
      '$referrer',
      '$referring_domain',
    ],
  }
  const apiHost = process.env.REACT_APP_MIXPANEL_HOST
  if (apiHost) {
    options['api_host'] = apiHost
  }
  mixpanel.init(token, options)
  // disable mixpanel to report data immediately
  mixpanel.opt_out_tracking()
  const res = await client.getInstance().getInfo()
  if (res?.data?.disable_telemetry === false) {
    mixpanel.register({
      $current_url: getPathInLocationHash(),
    })
    mixpanel.opt_in_tracking()
  }
}
