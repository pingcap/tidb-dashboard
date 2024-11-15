import { createContext, useContext } from "react"

import { PromResultItem, SinglePanelConfig } from "../utils/type"

////////////////////////////////

type AppApi = {
  getMetric(params: {
    promql: string
    beginTime: number
    endTime: number
    step: number
  }): Promise<PromResultItem[]>
}

type AppConfig = {
  title?: string
  metricQueriesConfig: SinglePanelConfig[]
}

export type AppCtxValue = {
  // we use ctxId to be a part of queryKey for react-query,
  // to differ same requests from different clusters, so this value can be clusterId, or other unique value
  ctxId: string
  api: AppApi
  cfg: AppConfig
}

export const AppContext = createContext<AppCtxValue | null>(null)

export const useAppContext = () => {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error("Metric AppContext must be used within a provider")
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
