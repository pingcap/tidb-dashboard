import React from 'react'
import { SlowQueryApp, SlowQueryProvider } from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <SlowQueryProvider value={ctx}>
      <SlowQueryApp />
    </SlowQueryProvider>
  )
}
