import React from 'react'
import { TopSQLApp, TopSQLProvider } from '@pingcap/tidb-dashboard-lib'
import { getStartOptions } from '~/uilts/appOptions'
import { ctx } from './context'

export default function () {
  return (
    <TopSQLProvider value={ctx(getStartOptions().appsConfig?.topSQL || {})}>
      <TopSQLApp />
    </TopSQLProvider>
  )
}
