import { createContext, useContext } from "react"

import { SlowqueryModel } from "../models"

////////////////////////////////

type AppApi = {
  getSlowQueries(params: {
    limit: number
    term: string
  }): Promise<SlowqueryModel[]>
  getSlowQuery(params: { id: number }): Promise<SlowqueryModel>

  getDbs(): Promise<string[]>
  getRuGroups(): Promise<string[]>
}

type AppConfig = {
  title?: string
}

type AppActions = {
  openDetail(query: string): void
  backToList(): void
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
    throw new Error("SlowQuery AppContext must be used within a provider")
  }

  return context
}
