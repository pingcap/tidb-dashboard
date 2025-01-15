import { createContext, useContext } from "react"

////////////////////////////////
export type SqlLimitStatusItem = {
  id: string
  ru_group: string
  action: string
  start_time: string
}

export type AppApi = {
  // sql limit
  getRuGroups(): Promise<string[]>
  checkSqlLimitSupport(): Promise<{ is_support: boolean }>
  getSqlLimitStatus(params: {
    watchText: string
  }): Promise<SqlLimitStatusItem[]>
  createSqlLimit(params: {
    watchText: string
    ruGroup: string
    action: string
  }): Promise<void>
  deleteSqlLimit(params: { watchText: string; id: string }): Promise<void>
}

export type AppCtxValue = {
  // we use ctxId to be a part of queryKey for react-query,
  // to differ same requests from different clusters, so this value can be clusterId, or other unique value
  ctxId: string
  sqlDigest: string

  api: AppApi
}

export const AppContext = createContext<AppCtxValue | null>(null)

export const useAppContext = () => {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error("SqlLimit AppContext must be used within a provider")
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
