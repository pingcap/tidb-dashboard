import React from 'react'
import {
  ClusterInfoApp,
  ClusterInfoProvider
} from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <ClusterInfoProvider value={ctx}>
      <ClusterInfoApp />
    </ClusterInfoProvider>
  )
}
