import React from 'react'
import {
  InstanceProfilingApp,
  InstanceProfilingProvider
} from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <InstanceProfilingProvider value={ctx}>
      <InstanceProfilingApp />
    </InstanceProfilingProvider>
  )
}
