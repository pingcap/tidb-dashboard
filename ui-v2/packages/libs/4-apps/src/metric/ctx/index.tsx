import { PromResultItem } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { createContext, useContext } from "react"

import { MetricConfigKind, SinglePanelConfig } from "../utils/type"

////////////////////////////////

export type MetricDataByNameResultItem = {
  expr: string
  legend: string
  result: PromResultItem[]
}

type AppApi = {
  getMetricQueriesConfig(kind: MetricConfigKind): Promise<SinglePanelConfig[]>

  getMetricLabelValues(params: {
    metricName: string
    labelName: string
    beginTime: number
    endTime: number
  }): Promise<string[]>

  getMetricDataByPromQL(params: {
    promQL: string
    beginTime: number
    endTime: number
    step: number
  }): Promise<PromResultItem[]>

  getMetricDataByMetricName(params: {
    metricName: string
    beginTime: number
    endTime: number
    step: number
    label?: string
  }): Promise<MetricDataByNameResultItem[]>
}

type AppConfig = {
  title?: string
  scrapeInterval?: number
}

type AppActions = {
  openDiagnosis(id: string): void
}

export type AppCtxValue = {
  // we use ctxId to be a part of queryKey for react-query,
  // to differ same requests from different clusters, so this value can be clusterId, or other unique value
  ctxId: string
  api: AppApi
  cfg: AppConfig
  actions: AppActions
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
