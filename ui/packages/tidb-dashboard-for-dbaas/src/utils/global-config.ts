import { createContext } from 'react'

export interface IGlobalConfig {
  apiPathBase: string
  apiToken: string

  mixpanelUser: string
  timezone: number | null
  promBaseUrl: string

  clusterInfo: {
    orgId: string
    tenantPlan: string // FREE_TRIAL / POC / ON_DEMAND
    projectId: string
    clusterId: string
    deployType: string // Dedicated / Dev Tier
  }
}

export const GlobalConfigContext = createContext<IGlobalConfig | null>(null)
export const GlobalConfigProvider = GlobalConfigContext.Provider
