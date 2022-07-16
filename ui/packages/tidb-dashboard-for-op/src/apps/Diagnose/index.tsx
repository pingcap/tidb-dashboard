import React from 'react'
import { DiagnoseApp, DiagnoseProvider } from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <DiagnoseProvider value={ctx}>
      <DiagnoseApp />
    </DiagnoseProvider>
  )
}
