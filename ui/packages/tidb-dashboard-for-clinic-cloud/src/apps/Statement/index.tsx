import React from 'react'
import { StatementApp, StatementProvider } from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'
import { getGlobalConfig } from '~/utils/globalConfig'

export default function () {
  return (
    <StatementProvider
      value={ctx(getGlobalConfig().appsConfig?.statement || {})}
    >
      <StatementApp />
    </StatementProvider>
  )
}
