import mixpanel from 'mixpanel-browser'
import { InfoInfoResponse } from '@lib/client'
import { getPathInLocationHash } from './routing'

export { mixpanel }

export async function init(info: InfoInfoResponse) {
  const token =
    process.env.REACT_APP_MIXPANEL_TOKEN || '00000000000000000000000000000000'
  mixpanel.init(token, {
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
  })
  const customApiHost = process.env.REACT_APP_MIXPANEL_HOST
  if (customApiHost) {
    mixpanel.set_config({
      api_host: customApiHost,
    })
  }
  // disable mixpanel to report data immediately
  mixpanel.opt_out_tracking()
  if (info?.disable_telemetry === false) {
    mixpanel.register({
      $current_url: getPathInLocationHash(),
    })
    mixpanel.opt_in_tracking()
  }
}
