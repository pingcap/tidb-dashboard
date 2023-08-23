import React from 'react'
import {
  ResourceManagerApp,
  ResourceManagerProvider
} from '@pingcap/tidb-dashboard-lib'
import { getResourceManagerContext } from './context-impl'

export default function () {
  return (
    <ResourceManagerProvider value={getResourceManagerContext()}>
      <ResourceManagerApp />
    </ResourceManagerProvider>
  )
}
