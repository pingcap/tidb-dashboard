import React from 'react'
import { DeadlockApp, DeadlockProvider } from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <DeadlockProvider value={ctx}>
      <DeadlockApp />
    </DeadlockProvider>
  )
}
