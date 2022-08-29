import React from 'react'
import {
  SystemReportApp,
  SystemReportProvider
} from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <SystemReportProvider value={ctx}>
      <SystemReportApp />
    </SystemReportProvider>
  )
}
