import React from 'react'
import {
  QueryEditorApp,
  QueryEditorProvider
} from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <QueryEditorProvider value={ctx}>
      <QueryEditorApp />
    </QueryEditorProvider>
  )
}
