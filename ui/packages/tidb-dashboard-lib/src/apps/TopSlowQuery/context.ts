import { MetricsQueryResponse } from '@lib/client'
import { createContext, useContext } from 'react'

interface ISlowQuery {}

interface ITimeWindow {
  begin_time: number
  end_time: number
}

export interface ITopSlowQueryConfig {
  // for clinic
  orgName?: string
  clusterName?: string
  userName?: string
}

export type TopSlowQueryCtxValue = {
  // api
  api: {
    getAvailableTimeWindows(params: {
      from: number
      to: number
      tws: number
    }): Promise<ITimeWindow[]>

    getMetrics: (params: {
      start: number
      end: number
    }) => Promise<[number, number][]>

    getDatabaseList(params: { start: number; end: number }): Promise<string[]>

    getTopSlowQueries(params: {
      start: number
      end: number
      topType: string
      db: string
      internal: string
    }): Promise<ISlowQuery[]>
  }

  cfg: ITopSlowQueryConfig
}

export const TopSlowQueryContext = createContext<TopSlowQueryCtxValue | null>(
  null
)

export const useTopSlowQueryContext = () => {
  const context = useContext(TopSlowQueryContext)

  if (!context) {
    throw new Error('TopSlowQueryContext must be used within a provider')
  }

  return context
}
