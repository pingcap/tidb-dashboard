import React from 'react'
import {
  MaterializedViewApp,
  MaterializedViewProvider
} from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <MaterializedViewProvider value={ctx}>
      <MaterializedViewApp />
    </MaterializedViewProvider>
  )
}
