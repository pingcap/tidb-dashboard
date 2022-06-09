import { createContext } from 'react'

import { AxiosRequestConfig, AxiosPromise } from 'axios'

import { SlowqueryModel, SlowqueryGetListRequest } from './model'

export interface ISlowQueryDataSource {
  infoListDatabases(options?: AxiosRequestConfig): AxiosPromise<Array<string>>

  slowQueryAvailableFieldsGet(
    options?: AxiosRequestConfig
  ): AxiosPromise<Array<string>>

  slowQueryListGet(
    beginTime?: number,
    db?: Array<string>,
    desc?: boolean,
    digest?: string,
    endTime?: number,
    fields?: string,
    limit?: number,
    orderBy?: string,
    plans?: Array<string>,
    text?: string,
    options?: AxiosRequestConfig
  ): AxiosPromise<Array<SlowqueryModel>>

  slowQueryDetailGet(
    connectId?: string,
    digest?: string,
    timestamp?: number,
    options?: AxiosRequestConfig
  ): AxiosPromise<SlowqueryModel>

  slowQueryDownloadTokenPost(
    request: SlowqueryGetListRequest,
    options?: AxiosRequestConfig
  ): AxiosPromise<string>

  // TODO: fix hack
  selectSlowQuery(model: SlowqueryModel): void
}

export interface ISlowQueryConfig {
  basePath: string
}

export interface ISlowQueryContext {
  ds: ISlowQueryDataSource
  config: ISlowQueryConfig
}

export const SlowQueryContext = createContext<ISlowQueryContext | null>(null)
