import React, { useMemo } from 'react'
import { TopSlowQueryContext } from '@pingcap/tidb-dashboard-lib'
import { getGlobalConfig } from '~/utils/globalConfig'

export function TopSlowQueryProvider(props: { children: React.ReactNode }) {
  const ctxValue = useMemo(() => {
    return {
      api: {
        getAvailableTimeRanges: async () => {
          return []
        },
        getTopSlowQueries: async () => {
          return []
        }
      },
      cfg: getGlobalConfig().appsConfig?.topSlowQuery || {}
    }
  }, [])

  return (
    <TopSlowQueryContext.Provider value={ctxValue}>
      {props.children}
    </TopSlowQueryContext.Provider>
  )
}
