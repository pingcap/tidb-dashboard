import { createContext } from 'react'

export interface IGlobalConfig {
  apiPathBase: string
  apiToken: string
  mixpanelUser: string
  timezone: number | null
  promBaseUrl: string
}

export const GlobalConfigContext = createContext<IGlobalConfig | null>(null)
export const GlobalConfigProvider = GlobalConfigContext.Provider
