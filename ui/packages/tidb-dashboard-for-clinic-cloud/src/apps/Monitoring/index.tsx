import React from 'react'
import { MonitoringApp, MonitoringProvider } from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <MonitoringProvider value={ctx}>
      <MonitoringApp />
    </MonitoringProvider>
  )
}
