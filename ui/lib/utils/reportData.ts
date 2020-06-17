import mixpanel from 'mixpanel-browser'
import client from '@lib/client'

export async function init() {
  mixpanel.init('cb1135f29a413c653332990f07b3586a', {
    opt_out_tracking_by_default: true,
  })
  // check option
  const res = await client.getInstance().getInfo()
  if (res?.data?.enable_report) {
    mixpanel.opt_in_tracking()
  }
}

export function report(eventType: string, eventBody: object) {
  mixpanel.track(eventType, eventBody)
}
