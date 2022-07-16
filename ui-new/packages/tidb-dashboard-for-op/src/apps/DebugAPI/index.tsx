import React from 'react'
import { DebugAPIApp, DebugAPIProvider } from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <DebugAPIProvider value={ctx}>
      <DebugAPIApp />
    </DebugAPIProvider>
  )
}
