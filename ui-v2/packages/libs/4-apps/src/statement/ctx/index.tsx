import { AdvancedFilterItem } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { createContext, useContext } from "react"

import { AppApi as SqlHistoryAppApi } from "../../_shared/sql-history"
import { AppApi as SqlLimitAppApi } from "../../_shared/sql-limit"
import {
  AdvancedFilterInfoModel,
  StatementConfigModel,
  StatementModel,
} from "../models"

////////////////////////////////

type AppApi = SqlLimitAppApi &
  SqlHistoryAppApi & {
    // config
    getStmtConfig(): Promise<StatementConfigModel>
    updateStmtConfig(params: StatementConfigModel): Promise<void>

    // filters
    getDbs(): Promise<string[]>
    getStmtKinds(): Promise<string[]>
    // advanced filters
    getAdvancedFilterNames(): Promise<string[]>
    getAdvancedFilterInfo(params: {
      name: string
    }): Promise<AdvancedFilterInfoModel>
    // available fields
    getAvailableFields(): Promise<string[]>

    // list & detail
    getStmtList(params: {
      beginTime: number
      endTime: number
      dbs: string[]
      ruGroups: string[]
      stmtKinds: string[]
      term: string
      advancedFilters: AdvancedFilterItem[]
      fields: string[]
      orderBy: string
      desc: boolean
      pageSize: number
      pageIndex: number
    }): Promise<{ total: number; items: StatementModel[] }>
    getStmtPlans(params: { id: string }): Promise<StatementModel[]>
    getStmtPlansDetail(params: {
      id: string
      plans: string[]
    }): Promise<StatementModel>

    // sql plan bind
    checkPlanBindSupport(): Promise<{ is_support: boolean }>
    getPlanBindStatus(params: {
      sqlDigest: string
      beginTime: number
      endTime: number
    }): Promise<string[]>
    createPlanBind(params: { planDigest: string }): Promise<void>
    deletePlanBind(params: { sqlDigest: string }): Promise<void>
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
  openDetail(id: string, newTab: boolean): void
  backToList(): void
  openSlowQueryList(id: string): void
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
    throw new Error("Statement AppContext must be used within a provider")
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
