import React from 'react'
import { StatementApp, StatementProvider } from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <StatementProvider value={ctx}>
      <StatementApp />
    </StatementProvider>
  )
}
