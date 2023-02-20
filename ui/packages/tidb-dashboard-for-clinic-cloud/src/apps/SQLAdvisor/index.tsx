import React from 'react'
import { SQLAdvisorAPP, SQLAdvisorProvider } from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <SQLAdvisorProvider value={ctx}>
      <SQLAdvisorAPP />
    </SQLAdvisorProvider>
  )
}
