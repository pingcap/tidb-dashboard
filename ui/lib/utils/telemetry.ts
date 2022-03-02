// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.
import mixpanel, { Config } from 'mixpanel-browser'
import { InfoInfoResponse } from '@lib/client'
import { getPathInLocationHash } from './routing'

export { mixpanel }

export async function init(info: InfoInfoResponse) {
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
      '$referring_domain',
    ],
    debug: process.env.NODE_ENV === 'development',
  }
  const apiHost = process.env.REACT_APP_MIXPANEL_HOST
  if (apiHost) {
    options['api_host'] = apiHost
  }
  mixpanel.init(token, options)
  // disable mixpanel to report data immediately
  mixpanel.opt_out_tracking()
  if (info?.enable_telemetry) {
    mixpanel.register({
      $current_url: getPathInLocationHash(),
      dashboard_version: info.version?.internal_version,
    })
    mixpanel.opt_in_tracking()
  }
}
