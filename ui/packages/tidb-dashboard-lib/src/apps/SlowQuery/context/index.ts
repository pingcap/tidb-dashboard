import { createContext } from 'react'

import { AxiosPromise } from 'axios'

import { SlowqueryModel, SlowqueryGetListRequest } from '@lib/client'

import { IContextConfig, ReqConfig } from '@lib/types'
import { PromDataSuccessResponse } from '@lib/utils'

export interface ISlowQueryDataSource {
  getDatabaseList(
    beginTime: number,
    endTime: number,
    options?: ReqConfig
  ): AxiosPromise<Array<string>>

  infoListResourceGroupNames(options?: ReqConfig): AxiosPromise<Array<string>>

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
    resourceGroup?: Array<string>,
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

  slowQueryAnalyze?(start: number, end: number): AxiosPromise

  slowQueryDownloadDBFile?(begin_time: number, end_time: number): AxiosPromise

  promqlQuery?(
    query: string,
    time: number,
    timeout: string
  ): AxiosPromise<PromDataSuccessResponse>

  promqlQueryRange?(
    query: string,
    start: number,
    end: number,
    step: string
  ): AxiosPromise<PromDataSuccessResponse>
}

export interface ISlowQueryEvent {
  selectSlowQueryItem(item: SlowqueryModel): void
}

export interface ISlowQueryConfig extends IContextConfig {
  enableExport: boolean
  showDBFilter: boolean
  showResourceGroupFilter: boolean
  showDigestFilter: boolean
  showHelp?: boolean

  // true means the list api will return all fields value of an item, not just the selected fields
  // in this case, the detail page doesn't need to request detail api any more
  listApiReturnDetail?: boolean

  // true means start to search instantly after changing any filter options
  // false means only to start searching after clicking the "Query" button
  instantQuery?: boolean

  // to limit the time range picker range
  timeRangeSelector?: {
    recentSeconds: number[]
    customAbsoluteRangePicker: boolean
  }

  // for clinic
  orgName?: string
  clusterName?: string
  showTopSlowQueryLink?: boolean
  showDownloadSlowQueryDBFile?: boolean
}

export interface ISlowQueryContext {
  ds: ISlowQueryDataSource
  event?: ISlowQueryEvent
  cfg: ISlowQueryConfig
}

export const SlowQueryContext = createContext<ISlowQueryContext | null>(null)

export const SlowQueryProvider = SlowQueryContext.Provider
