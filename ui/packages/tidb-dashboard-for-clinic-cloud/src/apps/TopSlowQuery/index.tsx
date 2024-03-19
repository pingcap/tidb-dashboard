import React from 'react'
import { TopSlowQueryApp } from '@pingcap/tidb-dashboard-lib'
import { TopSlowQueryProvider } from './context-provider'

export default function () {
  return (
    <TopSlowQueryProvider>
      <TopSlowQueryApp />
    </TopSlowQueryProvider>
  )
}
