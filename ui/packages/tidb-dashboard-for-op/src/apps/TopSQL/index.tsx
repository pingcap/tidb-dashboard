import React from 'react'
import { TopSQLApp, TopSQLProvider } from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <TopSQLProvider value={ctx}>
      <TopSQLApp />
    </TopSQLProvider>
  )
}
