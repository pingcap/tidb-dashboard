import React from 'react'
import { SlowQueryApp, SlowQueryProvider } from '@pingcap/tidb-dashboard-lib'
import { getStartOptions } from '~/uilts/appOptions'
import { ctx } from './context'

export default function () {
  return (
    <SlowQueryProvider
      value={ctx(getStartOptions().appsConfig?.slowQuery || {})}
    >
      <SlowQueryApp />
    </SlowQueryProvider>
  )
}
