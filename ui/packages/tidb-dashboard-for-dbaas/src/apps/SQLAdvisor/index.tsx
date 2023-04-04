import React, { useContext } from 'react'
import { SQLAdvisorAPP, SQLAdvisorProvider } from '@pingcap/tidb-dashboard-lib'
import { GlobalConfigContext } from '~/utils/global-config'
import { ctx } from './context'

export default function () {
  const globalConfig = useContext(GlobalConfigContext)

  return (
    <SQLAdvisorProvider value={ctx(globalConfig)}>
      <SQLAdvisorAPP />
    </SQLAdvisorProvider>
  )
}
