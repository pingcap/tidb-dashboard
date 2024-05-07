import React, { useMemo } from 'react'
import {
  TopSlowQueryContext,
  TopSlowQueryCtxValue
} from '@pingcap/tidb-dashboard-lib'
import { getGlobalConfig } from '~/utils/globalConfig'

import client from '~/client'

const debugHeaders = {
  // 'x-cluster-id': '1379661944646413143',
  // 'x-org-id': '1372813089209061633',
  // 'x-project-id': '1372813089454525346',
  // 'x-provider': 'aws',
  // 'x-region': 'us-east-1',
  // 'x-env': 'prod'
}

export function TopSlowQueryProvider(props: { children: React.ReactNode }) {
  const ctxValue = useMemo<TopSlowQueryCtxValue>(() => {
    return {
      api: {
        getAvailableTimeWindows: async ({
          from,
          to,
          duration
        }: {
          from: number
          to: number
          duration: number
        }) => {
          const hours = duration / 3600
          return client
            .getAxiosInstance()
            .get(
              `/slow_query/stats/time_windows?begin_time=${from}&end_time=${to}&hours=${hours}`,
              {
                headers: debugHeaders
              }
            )
            .then((res) => res.data)
        },

        getMetrics: async (params: { start: number; end: number }) => {
          const hours = (params.end - params.start) / 3600
          return client
            .getAxiosInstance()
            .get(
              `/slow_query/stats/metric?begin_time=${params.start}&hours=${hours}&metric_name=count_per_minute`,
              {
                headers: debugHeaders
              }
            )
            .then((res) => res.data)
        },

        getDatabaseList: async (params: { start: number; end: number }) => {
          const hours = (params.end - params.start) / 3600
          return client
            .getAxiosInstance()
            .get(
              `/slow_query/stats/databases?begin_time=${params.start}&hours=${hours}`,
              {
                headers: debugHeaders
              }
            )
            .then((res) => res.data)
        },

        getTopSlowQueries: async (params: {
          start: number
          end: number
          order: string
          dbs: string[]
          internal: string
          stmtKinds: string[]
        }) => {
          const hours = (params.end - params.start) / 3600
          const p = new URLSearchParams()
          p.append('begin_time', params.start + '')
          p.append('hours', hours + '')
          p.append('order_by', params.order)
          p.append('limit', '10')
          params.dbs.forEach((d) => p.append('databases', d))
          params.stmtKinds.forEach((d) => p.append('statement_types', d))

          return client
            .getAxiosInstance()
            .get(`/slow_query/stats?${p.toString()}`, {
              headers: debugHeaders
            })
            .then((res) => res.data)
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
