import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import { SlowqueryModel, SlowqueryGetListRequest } from '@lib/client'

import { IContextConfig, ReqConfig } from '@lib/types'

export interface ISlowQueryDataSource {
  infoListDatabases(options?: ReqConfig): AxiosPromise<Array<string>>

  slowQueryAvailableFieldsGet(options?: ReqConfig): AxiosPromise<Array<string>>

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
    options?: ReqConfig
  ): AxiosPromise<Array<SlowqueryModel>>

  slowQueryDetailGet(
    connectId?: string,
    digest?: string,
    timestamp?: number,
    options?: ReqConfig
  ): AxiosPromise<SlowqueryModel>

  slowQueryDownloadTokenPost(
    request: SlowqueryGetListRequest,
    options?: ReqConfig
  ): AxiosPromise<string>
}

export interface ISlowQueryEvent {
  selectSlowQueryItem(item: SlowqueryModel): void
}

export interface ISlowQueryConfig extends IContextConfig {
  enableExport: boolean
  showDBFilter: boolean
  showHelp?: boolean
}

export interface ISlowQueryContext {
  ds: ISlowQueryDataSource
  event?: ISlowQueryEvent
  cfg: ISlowQueryConfig
}

export const SlowQueryContext = createContext<ISlowQueryContext | null>(null)

export const SlowQueryProvider = SlowQueryContext.Provider
