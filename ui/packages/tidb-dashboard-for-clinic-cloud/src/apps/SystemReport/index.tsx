import React, { useMemo } from 'react'
import {
  SystemReportApp,
  SystemReportProvider
} from '@pingcap/tidb-dashboard-lib'
import { ctx, DsExtra } from './context'

function getDsExtra(): DsExtra {
  const searchParams = new URLSearchParams(window.location.search)
  return {
    orgId: searchParams.get('orgId')!,
    clusterId: searchParams.get('clusterId')!
  }
}

export default function () {
  const dsExtra = useMemo(() => getDsExtra(), [])

  return (
    <SystemReportProvider value={ctx(dsExtra)}>
      <SystemReportApp />
    </SystemReportProvider>
  )
}
