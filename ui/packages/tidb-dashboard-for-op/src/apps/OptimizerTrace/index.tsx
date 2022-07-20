import React from 'react'
import {
  OptimizerTraceApp,
  OptimizerTraceProvider
} from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <OptimizerTraceProvider value={ctx}>
      <OptimizerTraceApp />
    </OptimizerTraceProvider>
  )
}
