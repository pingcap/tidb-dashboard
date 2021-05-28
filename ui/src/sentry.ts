import * as Sentry from '@sentry/react'
import { Integrations } from '@sentry/tracing'

import { sentryEnabled } from '@lib/utils/sentryHelpers'

if (sentryEnabled) {
  const version = process.env.RELEASE_VERSION
  const name = process.env.REACT_APP_NAME
  const hash = process.env.REACT_APP_COMMIT_HASH
  const release = `${name}@${version}+${hash}`

  // this is on purpose
  console.log('current release: ', release)

  const SAMPLE_RATE_PROD = 0.6

  // sentry also provides a beforeSend hook, but it intentionally ignores transactions.
  // see https://github.com/getsentry/sentry-javascript/blob/de87032dbe0dc4720400e92f673c5292d452f51c/packages/core/src/baseclient.ts#L510-L512
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    integrations: [new Integrations.BrowserTracing()],
    tracesSampleRate:
      process.env.NODE_ENV === 'production' ? SAMPLE_RATE_PROD : 1.0,
    release,
    environment: process.env.NODE_ENV,
  })
}
