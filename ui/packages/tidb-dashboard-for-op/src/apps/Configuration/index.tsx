import React from 'react'
import {
  ConfigurationApp,
  ConfigurationProvider
} from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <ConfigurationProvider value={ctx}>
      <ConfigurationApp />
    </ConfigurationProvider>
  )
}
