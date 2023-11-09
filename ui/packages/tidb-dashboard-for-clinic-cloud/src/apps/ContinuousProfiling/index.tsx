import React from 'react'
import {
  ConProfilingApp,
  ConProfilingProvider
} from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'
import { getGlobalConfig } from '~/utils/globalConfig'

export default function () {
  return (
    <ConProfilingProvider
      value={ctx(getGlobalConfig().appsConfig?.conProf || {})}
    >
      <ConProfilingApp />
    </ConProfilingProvider>
  )
}
