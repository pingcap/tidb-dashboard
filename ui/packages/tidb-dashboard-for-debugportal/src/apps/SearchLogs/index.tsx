import React from 'react'
import { SearchLogsApp, SearchLogsProvider } from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <SearchLogsProvider value={ctx}>
      <SearchLogsApp />
    </SearchLogsProvider>
  )
}
