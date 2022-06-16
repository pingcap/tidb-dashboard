import React from 'react'
import { SlowQueryApp, SlowQueryProvider } from '@pingcap/tidb-dashboard-lib'

export default function () {
  return (
    <SlowQueryProvider value={null}>
      <SlowQueryApp />
    </SlowQueryProvider>
  )
}
