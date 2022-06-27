import React from 'react'
import { KeyVizApp, KeyVizProvider } from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <KeyVizProvider value={ctx}>
      <KeyVizApp />
    </KeyVizProvider>
  )
}
