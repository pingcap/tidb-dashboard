import React, { useMemo } from 'react'
import {
  TopSlowQueryContext,
  TopSlowQueryCtxValue
} from '@pingcap/tidb-dashboard-lib'
import { getGlobalConfig } from '~/utils/globalConfig'
import client from '~/client'

import metricsJson from './sample-data/metrics.json'
import slowQueryJson from './sample-data/slowqueries.json'

export function TopSlowQueryProvider(props: { children: React.ReactNode }) {
  const ctxValue = useMemo<TopSlowQueryCtxValue>(() => {
    return {
      api: {
        getAvailableTimeWindows: async ({
          from,
          to,
          tws
        }: {
          from: number
          to: number
          tws: number
        }) => {
          // return client
          //   .getAxiosInstance()
          //   .get(`/top_slowquery/time_windows?from=${from}&to=${to}&tws=${tws}`)
          //   .then((res) => res.data)

          // mock
          const d = new Date(2024, 3, 6, 18, 0, 0, 0).getTime() / 1000
          return [
            {
              start: d - tws,
              end: d
            },
            {
              start: d - 2 * tws,
              end: d - tws
            },
            {
              start: d - 3 * tws,
              end: d - 2 * tws
            }
          ]
        },

        getMetrics: async (params: { start: number; end: number }) => {
          const res: [number, number][] = []
          const step = (params.end - params.start) / 10
          for (let i = 0; i < 10; i++) {
            res.push([
              (params.start + i * step) * 1000, // Convert seconds to milliseconds
              Math.floor(Math.random() * 1000)
            ])
          }

          return res
        },

        getDatabaseList: async () => {
          return ['test1', 'test2', 'test3']
        },

        getTopSlowQueries: async (params: {
          start: number
          end: number
          topType: string
          db: string
          internal: string
        }) => {
          if (params.start === 0) return []
          return slowQueryJson
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
