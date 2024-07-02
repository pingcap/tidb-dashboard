import React from 'react'
import { KeyVizApp, KeyVizProvider } from '@pingcap/tidb-dashboard-lib'
import { getGlobalConfig } from '~/utils/globalConfig'
import { ctx } from './context'

export default function () {
  return (
    <KeyVizProvider value={ctx(getGlobalConfig().appsConfig?.keyViz || {})}>
      <KeyVizApp />
    </KeyVizProvider>
  )
}
