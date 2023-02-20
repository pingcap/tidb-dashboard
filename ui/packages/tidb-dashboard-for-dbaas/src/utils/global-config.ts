import { createContext } from 'react'

export enum DeployType {
  ServerlessTier = 'Serverless Tier',
  Dedicated = 'Dedicated'
}

export interface IGlobalConfig {
  apiPathBase: string
  apiToken: string

  mixpanelUser: string
  timezone: number | null
  promBaseUrl: string
  performanceInsightBaseUrl: string

  expandMetricsData: boolean

  clusterInfo: {
    orgId: string
    tenantPlan: string // FREE_TRIAL / POC / ON_DEMAND
    projectId: string
    clusterId: string
    deployType: DeployType
  }
}

export const GlobalConfigContext = createContext<IGlobalConfig | null>(null)
export const GlobalConfigProvider = GlobalConfigContext.Provider
