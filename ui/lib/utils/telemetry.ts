import mixpanel from 'mixpanel-browser'
import client from '@lib/client'

export async function init() {
  mixpanel.init(process.env.REACT_APP_MIXPANEL_TOKEN, {
    opt_out_tracking_by_default: true,
    property_blacklist: [
      '$initial_referrer',
      '$initial_referring_domain',
      '$referrer',
      '$referring_domain',
    ],
  })
  // check option
  const res = await client.getInstance().getInfo()
  if (res?.data?.disable_telemetry === false) {
    // https://developer.mixpanel.com/docs/javascript-full-api-reference#mixpanelset_config
    mixpanel.set_config({
      batch_requests: true,
      persistence: 'localStorage',
    })
    mixpanel.opt_in_tracking({
      $current_url: getPathInUrlHash(),
    })
  }
}

function getPathInUrlHash(): string {
  const fullUrlHash = window.location.hash
  const pos = fullUrlHash.indexOf('?')
  if (pos === -1) {
    return fullUrlHash
  }
  return fullUrlHash.substring(0, pos)
}

export function track(eventType: string, eventBody: object = {}) {
  mixpanel.track(eventType, {
    ...eventBody,
    $current_url: getPathInUrlHash(),
  })
}
