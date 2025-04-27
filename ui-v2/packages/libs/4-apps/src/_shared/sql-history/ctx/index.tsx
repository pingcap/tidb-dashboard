import { TimeRange } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { createContext, useContext } from "react"

////////////////////////////////

export type HistoryMetricItem = {
  name: string
  unit: string
}

export type AppApi = {
  getHistoryMetricNames(): Promise<HistoryMetricItem[]>
  getHistoryMetricData(params: {
    sqlDigest: string
    metricName: string
    beginTime: number
    endTime: number
  }): Promise<[number, number][]>
}

export type AppConfig = {
  parentAppName: string // 'slow-query' | 'statement'
  sqlDigest: string
  initialTimeRange: TimeRange
  timeRangeMaxDuration?: number // unit: seconds
}

export type AppCtxValue = {
  // we use ctxId to be a part of queryKey for react-query,
  // to differ same requests from different clusters, so this value can be clusterId, or other unique value
  ctxId: string
  cfg: AppConfig
  api: AppApi
}

export const AppContext = createContext<AppCtxValue | null>(null)

export const useAppContext = () => {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error("SqlHistory AppContext must be used within a provider")
  }

  return context
}

////////////////////////////////

export function AppProvider(props: {
  children: React.ReactNode
  ctxValue: AppCtxValue
}) {
  return (
    <AppContext.Provider value={props.ctxValue}>
      {props.children}
    </AppContext.Provider>
  )
}
