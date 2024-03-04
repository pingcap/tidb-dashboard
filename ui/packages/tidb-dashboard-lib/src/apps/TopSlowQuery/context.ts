import { createContext, useContext } from 'react'

interface ISlowQuery {}

interface ITimeRange {
  start: number
  end: number
}

export interface ITopSlowQueryConfig {
  // for clinic
  orgName?: string
  clusterName?: string
  userName?: string
}

type TopSlowQueryCtxValue = {
  // api
  api: {
    getAvailableTimeRanges(): Promise<ITimeRange[]>
    getTopSlowQueries(): Promise<ISlowQuery[]>
  }

  cfg: ITopSlowQueryConfig
}

export const TopSlowQueryContext = createContext<TopSlowQueryCtxValue | null>(
  null
)
export const ChatContext = createContext<TopSlowQueryCtxValue | null>(null)

export const useTopSlowQueryContext = () => {
  const context = useContext(TopSlowQueryContext)

  if (!context) {
    throw new Error('TopSlowQueryContext must be used within a provider')
  }

  return context
}
