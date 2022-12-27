import React from 'react'
import { OverviewApp, OverviewProvider } from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <OverviewProvider value={ctx}>
      <OverviewApp />
    </OverviewProvider>
  )
}
