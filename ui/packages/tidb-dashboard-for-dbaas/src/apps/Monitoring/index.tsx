import React, { useContext } from 'react'
import { MonitoringApp, MonitoringProvider } from '@pingcap/tidb-dashboard-lib'
import { GlobalConfigContext } from '~/utils/global-config'
import { ctx } from './context'

export default function () {
  const globalConfig = useContext(GlobalConfigContext)

  return (
    <MonitoringProvider value={ctx(globalConfig)}>
      <MonitoringApp />
    </MonitoringProvider>
  )
}
