import React from 'react'
import { MetricsApp, MetricsProvider } from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <MetricsProvider value={ctx}>
      <MetricsApp />
    </MetricsProvider>
  )
}
