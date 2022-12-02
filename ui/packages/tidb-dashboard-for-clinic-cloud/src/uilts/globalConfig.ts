import {
  IOverviewConfig,
  ISlowQueryConfig,
  ITopSQLConfig
} from '@pingcap/tidb-dashboard-lib'

export type AppOptions = {
  lang: string
  hideNav: boolean

  skipNgmCheck: boolean
  skipLoadAppInfo: boolean
  skipReloadWhoAmI: boolean
}

export const defAppOptions: AppOptions = {
  lang: 'en',
  hideNav: false,

  skipNgmCheck: false,
  skipLoadAppInfo: false,
  skipReloadWhoAmI: false
}

export type ClientOptions = {
  apiPathBase: string
  apiToken: string
}

export type ClusterInfo = {
  provider?: string
  region?: string
  orgId?: string
  projectId?: string
  clusterId?: string
  deployType?: string // dedicated / shared
}

export type AppsConfig = {
  overview?: Partial<IOverviewConfig>
  slowQuery?: Partial<ISlowQueryConfig>
  topSQL?: Partial<ITopSQLConfig>
}

export type GlobalConfig = {
  appOptions?: AppOptions
  clientOptions: ClientOptions
  clusterInfo: ClusterInfo
  appsConfig?: AppsConfig
}

// export const GlobalConfigContext = createContext<IGlobalConfig | null>(null)
// export const GlobalConfigProvider = GlobalConfigContext.Provider

/////////////////////////////////////

let _globalConfig: GlobalConfig

export function setGlobalConfig(c: GlobalConfig) {
  _globalConfig = c
}
export function getGlobalConfig(): GlobalConfig {
  return _globalConfig
}
