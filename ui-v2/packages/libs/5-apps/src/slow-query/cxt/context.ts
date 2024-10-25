import { createContext, useContext } from "react"

interface ISlowQuery {
  id: number
  query: string
  latency: number
}

////////////////////////////////

type AppApi = {
  getSlowQueries(params: { term: string }): Promise<ISlowQuery[]>
  getSlowQuery(params: { id: number }): Promise<ISlowQuery>
}

type AppConfig = {
  title?: string
  showSearch?: boolean
}

type AppActions = {
  openDetail(id: number): void
}

export type AppCtxValue = {
  api: AppApi
  cfg: AppConfig
  actions: AppActions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extra: any
}

export const AppContext = createContext<AppCtxValue | null>(null)

export const useAppContext = () => {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error("SlowQuery AppContext must be used within a provider")
  }

  return context
}
