import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import {
  RestErrorResponse,
  TopsqlEditableConfig,
  TopsqlInstanceResponse,
  TopsqlSummaryResponse
} from '@lib/client'

import { ReqConfig } from '@lib/types'

export interface TopsqlTikvNetworkIoCollectionConfig {
  /**
   * Whether enable TiKV network IO collection (resource-metering.enable-network-io-collection)
   */
  enable: boolean
  /**
   * Whether values are not identical across TiKV nodes
   */
  is_multi_value?: boolean
  /**
   * Whether detailed TiKV IO collection is enabled on all TiKV nodes
   * (resource-metering.enable-detailed-io-collection)
   */
  detailed_io_enabled?: boolean
  /**
   * Whether detailed IO collection values are not identical across TiKV nodes
   */
  detailed_io_is_multi_value?: boolean
  /**
   * Whether at least one TiKV node supports detailed IO collection
   */
  detailed_io_supported?: boolean
}

export interface TopsqlTikvNetworkIoCollectionUpdateResponse {
  warnings: RestErrorResponse[]
}

export interface ITopSQLDataSource {
  topsqlConfigGet(options?: ReqConfig): AxiosPromise<TopsqlEditableConfig>

  topsqlConfigPost(
    request: TopsqlEditableConfig,
    options?: ReqConfig
  ): AxiosPromise<string>

  topsqlTikvNetworkIoCollectionGet(
    options?: ReqConfig
  ): AxiosPromise<TopsqlTikvNetworkIoCollectionConfig>

  topsqlTikvNetworkIoCollectionPost(
    request: TopsqlTikvNetworkIoCollectionConfig,
    options?: ReqConfig
  ): AxiosPromise<TopsqlTikvNetworkIoCollectionUpdateResponse>

  topsqlInstancesGet(
    end?: string,
    start?: string,
    dataSource?: string,
    options?: ReqConfig
  ): AxiosPromise<TopsqlInstanceResponse>

  topsqlSummaryGet(
    end?: string,
    groupBy?: string,
    instance?: string,
    instanceType?: string,
    orderBy?: string,
    start?: string,
    top?: string,
    window?: string,
    dataSource?: string,
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
    timeRangeLimit?: number
  }
  autoRefresh?: boolean

  // for clinic
  orgName?: string
  clusterName?: string
  userName?: string

  showSearchInStatements?: boolean
  showLimit?: boolean
  showGroupBy?: boolean
  showGroupByRegion?: boolean
  showOrderBy?: boolean
  showDetailedIoDimensions?: boolean
  minWindowInterval?: number
  dataSource?: string
}

export interface ITopSQLContext {
  ds: ITopSQLDataSource
  cfg: ITopSQLConfig
}

export const TopSQLContext = createContext<ITopSQLContext | null>(null)

export const TopSQLProvider = TopSQLContext.Provider
