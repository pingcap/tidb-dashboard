import mixpanel from 'mixpanel-browser'

export function init() {
  mixpanel.init('cb1135f29a413c653332990f07b3586a', {
    opt_out_tracking_by_default: true,
  })
  // check option
  if (true) {
    mixpanel.opt_in_tracking()
  }
}

export function report(eventType: string, eventBody: object) {
  mixpanel.track(eventType, eventBody)
}
