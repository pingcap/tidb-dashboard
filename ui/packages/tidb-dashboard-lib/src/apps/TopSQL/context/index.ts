import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import {
  TopsqlEditableConfig,
  TopsqlInstanceResponse,
  TopsqlSummaryResponse
} from '@lib/client'

import { ReqConfig } from '@lib/types'

export interface ITopSQLDataSource {
  topsqlConfigGet(options?: ReqConfig): AxiosPromise<TopsqlEditableConfig>

  topsqlConfigPost(
    request: TopsqlEditableConfig,
    options?: ReqConfig
  ): AxiosPromise<string>

  topsqlInstancesGet(
    end?: string,
    start?: string,
    options?: ReqConfig
  ): AxiosPromise<TopsqlInstanceResponse>

  topsqlSummaryGet(
    end?: string,
    groupBy?: string,
    instance?: string,
    instanceType?: string,
    start?: string,
    top?: string,
    window?: string,
    options?: ReqConfig
  ): AxiosPromise<TopsqlSummaryResponse>
}

export interface ITopSQLConfig {
  checkNgm: boolean
  showSetting: boolean

  // to limit the time range picker range
  timeRangeSelector?: {
    recentSeconds: number[]
    customAbsoluteRangePicker: boolean
  }
  autoRefresh?: boolean

  // for clinic
  orgName?: string
  clusterName?: string
  userName?: string

  showSearchInStatements?: boolean
  showLimit?: boolean
  showGroupBy?: boolean
}

export interface ITopSQLContext {
  ds: ITopSQLDataSource
  cfg: ITopSQLConfig
}

export const TopSQLContext = createContext<ITopSQLContext | null>(null)

export const TopSQLProvider = TopSQLContext.Provider
