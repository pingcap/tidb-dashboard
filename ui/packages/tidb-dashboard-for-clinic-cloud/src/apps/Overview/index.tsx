import React from 'react'
import { OverviewApp, OverviewProvider } from '@pingcap/tidb-dashboard-lib'
import { getGlobalConfig } from '~/utils/globalConfig'
import { ctx } from './context'

export default function () {
  return (
    <OverviewProvider value={ctx(getGlobalConfig().appsConfig?.overview || {})}>
      <OverviewApp />
    </OverviewProvider>
  )
}
