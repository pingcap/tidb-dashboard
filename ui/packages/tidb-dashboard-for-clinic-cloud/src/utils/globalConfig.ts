import {
  IConProfilingConfig,
  IOverviewConfig,
  ISlowQueryConfig,
  IStatementConfig,
  ITopSQLConfig
} from '@pingcap/tidb-dashboard-lib'

export type AppOptions = {
  lang: string
  hideNav: boolean
  // hidePageLoadProgress controls whether show the thin progress bar in the top of the page when switching pages
  hidePageLoadProgress: boolean

  skipNgmCheck: boolean
  skipLoadAppInfo: boolean
  skipReloadWhoAmI: boolean
}

export const defAppOptions: AppOptions = {
  lang: 'en',
  hideNav: false,
  hidePageLoadProgress: false,

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
  statement?: Partial<IStatementConfig>
  topSQL?: Partial<ITopSQLConfig>
  conProf?: Partial<IConProfilingConfig>
}

export type GlobalConfig = {
  appOptions?: AppOptions
  clientOptions: ClientOptions
  clusterInfo: ClusterInfo

  appsConfig?: AppsConfig

  // internal api for performance insight
  performanceInsightBaseUrl: string

  // appsDisabled has a higher priority than appsEnabled
  appsDisabled?: string[]
  appsEnabled?: string[]
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
