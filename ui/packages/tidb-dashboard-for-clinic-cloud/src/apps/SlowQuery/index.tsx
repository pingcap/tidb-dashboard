import React from 'react'
import { SlowQueryApp, SlowQueryProvider } from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'
import { getStartOptions } from '~/uilts/appOptions'

export default function () {
  return (
    <SlowQueryProvider
      value={ctx(getStartOptions().appsConfig?.slowQuery || {})}
    >
      <SlowQueryApp />
    </SlowQueryProvider>
  )
}
