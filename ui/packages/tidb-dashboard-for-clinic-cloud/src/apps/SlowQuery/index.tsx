import React from 'react'
import { SlowQueryApp, SlowQueryProvider } from '@pingcap/tidb-dashboard-lib'
import { getGlobalConfig } from '~/uilts/globalConfig'
import { ctx } from './context'

export default function () {
  return (
    <SlowQueryProvider
      value={ctx(getGlobalConfig().appsConfig?.slowQuery || {})}
    >
      <SlowQueryApp />
    </SlowQueryProvider>
  )
}
