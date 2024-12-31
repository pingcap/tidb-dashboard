import { AdvancedFilterItem } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { createContext, useContext } from "react"

import { AppApi as SqlLimitAppApi } from "../../_shared/sql-limit"
import { AdvancedFilterInfoModel, SlowqueryModel } from "../models"

////////////////////////////////

type AppApi = SqlLimitAppApi & {
  // filters
  getDbs(): Promise<string[]>
  // advanced filters
  getAdvancedFilterNames(): Promise<string[]>
  getAdvancedFilterInfo(params: {
    name: string
  }): Promise<AdvancedFilterInfoModel>
  // available fields
  getAvailableFields(): Promise<string[]>

  // list & detail
  getSlowQueries(params: {
    beginTime: number
    endTime: number
    dbs: string[]
    ruGroups: string[]
    sqlDigest: string
    term: string
    limit: number
    orderBy: string
    desc: boolean
    advancedFilters: AdvancedFilterItem[]
    fields: string[]
  }): Promise<SlowqueryModel[]>

  getSlowQuery(params: { id: string }): Promise<SlowqueryModel>
}

type AppConfig = {
  title?: string
  // whether to show back to list page button in the detail page
  // if set to false, the back button will be hidden
  // and you need to handle the back action outside of the app by yourself
  // default is true
  showDetailBack?: boolean
}

type AppActions = {
  openDetail(id: string): void
  backToList(): void
  openStatementDetail(id: string): void
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
