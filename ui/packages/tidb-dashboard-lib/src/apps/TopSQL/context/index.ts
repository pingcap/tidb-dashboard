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
    instance?: string,
    instanceType?: string,
    start?: string,
    top?: string,
    window?: string,
    options?: ReqConfig
  ): AxiosPromise<TopsqlSummaryResponse>
}

export interface ITopSQLContext {
  ds: ITopSQLDataSource
}

export const TopSQLContext = createContext<ITopSQLContext | null>(null)

export const TopSQLProvider = TopSQLContext.Provider
