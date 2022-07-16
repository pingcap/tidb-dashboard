import React from 'react'
import {
  ConProfilingApp,
  ConProfilingProvider
} from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <ConProfilingProvider value={ctx}>
      <ConProfilingApp />
    </ConProfilingProvider>
  )
}
